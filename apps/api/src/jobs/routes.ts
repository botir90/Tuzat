import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  GUARANTEE_DAYS,
  REQUEST_TTL_HOURS,
  cancelJobSchema,
  createPriceChangeSchema,
  formatSum,
  jobStatusBodySchema,
  type CustomerOfferDto,
  type JobDto,
  type JobStatus,
  type Language,
} from '@usta/shared';
import { requireUser } from '../auth/authenticate';
import { names } from '../catalog/dto';
import type { AppContext } from '../context';
import type { User } from '../generated/prisma/client';
import { AppError, conflict, notFound } from '../lib/errors';
import { toOfferDto } from '../master/dto';
import { notifyInBackground, notifyUsers } from '../push/notify';
import { expireOldRequests } from '../requests/expire';
import { publicStorageEndpoint } from '../storage/public-endpoint';
import { currentPrice, jobInclude, toJobDto, toMasterCard } from './dto';

const idParams = z.object({ id: z.string().min(1) });
const offerParams = z.object({ id: z.string().min(1), offerId: z.string().min(1) });
const priceChangeParams = z.object({ id: z.string().min(1), pcId: z.string().min(1) });

/** Status names for push notifications. */
const STATUS_TEXT: Record<JobStatus, Record<Language, string>> = {
  ACCEPTED: { 'uz-Latn': 'Qabul qilindi', 'uz-Cyrl': 'Қабул қилинди', ru: 'Принято' },
  ON_THE_WAY: { 'uz-Latn': "Usta yo'lda", 'uz-Cyrl': 'Уста йўлда', ru: 'Мастер в пути' },
  IN_PROGRESS: { 'uz-Latn': 'Usta ishlayapti', 'uz-Cyrl': 'Уста ишлаяпти', ru: 'Мастер работает' },
  DONE: { 'uz-Latn': 'Ish tugadi', 'uz-Cyrl': 'Иш тугади', ru: 'Работа завершена' },
  CANCELLED: { 'uz-Latn': 'Bekor qilindi', 'uz-Cyrl': 'Бекор қилинди', ru: 'Отменено' },
};

/** Master's buttons: On the way → Started → Done. Each step only from the previous ones. */
const ALLOWED_FROM: Record<'ON_THE_WAY' | 'IN_PROGRESS' | 'DONE', JobStatus[]> = {
  ON_THE_WAY: ['ACCEPTED'],
  IN_PROGRESS: ['ACCEPTED', 'ON_THE_WAY'],
  DONE: ['IN_PROGRESS'],
};

export function registerJobRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { prisma, storage } = ctx;
  const endpoint = (request: FastifyRequest) => publicStorageEndpoint(ctx.env, request);

  /** Loads a job the user takes part in (as customer or master). */
  async function loadJob(id: string, user: User) {
    const job = await prisma.job.findUnique({ where: { id }, include: jobInclude });
    if (!job || (job.customerId !== user.id && job.masterId !== user.id)) throw notFound();
    return job;
  }

  function notifyStatus(
    job: { id: string; customerId: string; masterId: string },
    to: string,
    status: JobStatus,
  ) {
    notifyInBackground(
      ctx,
      notifyUsers(ctx, [to], 'jobStatus', (lang) => ({ status: STATUS_TEXT[status][lang] }), {
        type: 'job',
        jobId: job.id,
      }),
    );
  }

  // ---------- Customer: offers and choosing a master ----------

  app.get('/requests/:id/offers', async (request): Promise<CustomerOfferDto[]> => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    const target = await prisma.request.findUnique({ where: { id } });
    if (!target || target.customerId !== user.id) throw notFound();

    const offers = await prisma.offer.findMany({
      where: { requestId: id, status: { in: ['SENT', 'ACCEPTED'] } },
      orderBy: { createdAt: 'asc' },
      include: { master: { include: { masterProfile: true } } },
    });
    return Promise.all(
      offers.map(async (offer) => ({
        ...toOfferDto(offer),
        master: await toMasterCard(offer.master, storage, endpoint(request)),
      })),
    );
  });

  app.post('/requests/:id/offers/:offerId/accept', async (request, reply) => {
    const user = await requireUser(ctx, request);
    const { id, offerId } = offerParams.parse(request.params);
    const now = ctx.now();
    await expireOldRequests(prisma, now);

    const job = await prisma.$transaction(async (tx) => {
      const target = await tx.request.findUnique({ where: { id } });
      if (!target || target.customerId !== user.id) throw notFound();
      if (target.status !== 'OPEN') throw new AppError('REQUEST_NOT_OPEN', 409);
      const offer = await tx.offer.findUnique({ where: { id: offerId } });
      if (!offer || offer.requestId !== id || offer.status !== 'SENT') {
        throw new AppError('OFFER_NOT_AVAILABLE', 409);
      }

      // "status: OPEN" in the filter: if two taps race, only one wins.
      const { count } = await tx.request.updateMany({
        where: { id, status: 'OPEN' },
        data: { status: 'ASSIGNED' },
      });
      if (count === 0) throw new AppError('REQUEST_NOT_OPEN', 409);
      await tx.offer.update({ where: { id: offerId }, data: { status: 'ACCEPTED' } });
      await tx.offer.updateMany({
        where: { requestId: id, id: { not: offerId }, status: 'SENT' },
        data: { status: 'REJECTED' },
      });
      return tx.job.create({
        data: {
          requestId: id,
          offerId,
          customerId: user.id,
          masterId: offer.masterId,
          agreedPrice: offer.price,
          acceptedAt: now,
        },
        include: jobInclude,
      });
    });

    notifyInBackground(
      ctx,
      notifyUsers(
        ctx,
        [job.masterId],
        'offerAccepted',
        (lang) => ({
          category: names(job.request.category)[lang],
          district: names(job.request.district)[lang],
        }),
        { type: 'job', jobId: job.id },
      ),
    );
    return reply.code(201).send(await toJobDto(job, user.id, storage, endpoint(request)));
  });

  // ---------- Jobs (both sides) ----------

  app.get('/jobs', async (request): Promise<JobDto[]> => {
    const user = await requireUser(ctx, request);
    const jobs = await prisma.job.findMany({
      where: { OR: [{ customerId: user.id }, { masterId: user.id }] },
      orderBy: { acceptedAt: 'desc' },
      take: 50,
      include: jobInclude,
    });
    return Promise.all(jobs.map((job) => toJobDto(job, user.id, storage, endpoint(request))));
  });

  app.get('/jobs/:id', async (request): Promise<JobDto> => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    return toJobDto(await loadJob(id, user), user.id, storage, endpoint(request));
  });

  /**
   * Master: ON_THE_WAY → IN_PROGRESS → DONE. Customer may only mark DONE
   * (e.g. the master forgot to press the button).
   */
  app.post('/jobs/:id/status', async (request): Promise<JobDto> => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    const { status, etaMinutes } = jobStatusBodySchema.parse(request.body);
    const job = await loadJob(id, user);
    const isMaster = job.masterId === user.id;
    const now = ctx.now();

    if (!isMaster && status !== 'DONE') throw new AppError('JOB_STATUS_NOT_ALLOWED', 403);
    if (!ALLOWED_FROM[status].includes(job.status)) {
      throw new AppError('JOB_STATUS_NOT_ALLOWED', 409);
    }
    if (status === 'DONE' && job.priceChanges.some((pc) => pc.status === 'PENDING')) {
      throw new AppError('PRICE_CHANGE_PENDING', 409);
    }

    const data =
      status === 'ON_THE_WAY'
        ? { status, onTheWayAt: now, onTheWayEtaMinutes: etaMinutes ?? null }
        : status === 'IN_PROGRESS'
          ? { status, startedAt: now }
          : {
              status,
              doneAt: now,
              // Business rule: the final price is the agreed one unless a change was APPROVED.
              finalPrice: currentPrice(job),
              guaranteeUntil: new Date(now.getTime() + GUARANTEE_DAYS * 86_400_000),
            };

    // The status in the filter protects against two quick taps / both sides at once.
    const { count } = await prisma.job.updateMany({ where: { id, status: job.status }, data });
    if (count === 0) throw conflict();
    if (status === 'DONE') {
      await prisma.masterProfile.updateMany({
        where: { userId: job.masterId },
        data: { completedJobsCount: { increment: 1 } },
      });
    }

    notifyStatus(job, isMaster ? job.customerId : job.masterId, status);
    return toJobDto(await loadJob(id, user), user.id, storage, endpoint(request));
  });

  /**
   * Either side can cancel before the work starts.
   * Master cancels → the request opens again for other masters.
   * Customer cancels → the request is cancelled.
   */
  app.post('/jobs/:id/cancel', async (request): Promise<JobDto> => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    const { reason } = cancelJobSchema.parse(request.body ?? {});
    const job = await loadJob(id, user);
    const isMaster = job.masterId === user.id;
    const now = ctx.now();
    if (job.status !== 'ACCEPTED' && job.status !== 'ON_THE_WAY') {
      throw new AppError('JOB_STATUS_NOT_ALLOWED', 409);
    }

    await prisma.$transaction(async (tx) => {
      const { count } = await tx.job.updateMany({
        where: { id, status: job.status },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancelledById: user.id,
          cancelReason: reason || null,
        },
      });
      if (count === 0) throw conflict();
      if (isMaster) {
        await tx.offer.update({ where: { id: job.offerId }, data: { status: 'WITHDRAWN' } });
        await tx.request.update({
          where: { id: job.requestId },
          data: {
            status: 'OPEN',
            expiresAt: new Date(now.getTime() + REQUEST_TTL_HOURS * 3_600_000),
          },
        });
      } else {
        await tx.request.update({ where: { id: job.requestId }, data: { status: 'CANCELLED' } });
      }
    });

    notifyStatus(job, isMaster ? job.customerId : job.masterId, 'CANCELLED');
    return toJobDto(await loadJob(id, user), user.id, storage, endpoint(request));
  });

  // ---------- Price changes ----------

  /** Master: "extra parts are needed, the new price is X". The customer must approve. */
  app.post('/jobs/:id/price-changes', async (request, reply) => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    const body = createPriceChangeSchema.parse(request.body);
    const job = await loadJob(id, user);
    if (job.masterId !== user.id) throw new AppError('FORBIDDEN', 403);
    if (job.status === 'DONE' || job.status === 'CANCELLED') {
      throw new AppError('JOB_STATUS_NOT_ALLOWED', 409);
    }
    if (job.priceChanges.some((pc) => pc.status === 'PENDING')) {
      throw new AppError('PRICE_CHANGE_PENDING', 409);
    }

    await prisma.priceChange.create({
      data: { jobId: id, newPrice: body.newPrice, reason: body.reason, createdAt: ctx.now() },
    });
    notifyInBackground(
      ctx,
      notifyUsers(
        ctx,
        [job.customerId],
        'priceChange',
        () => ({ price: formatSum(body.newPrice) }),
        {
          type: 'job',
          jobId: id,
        },
      ),
    );
    return reply
      .code(201)
      .send(await toJobDto(await loadJob(id, user), user.id, storage, endpoint(request)));
  });

  async function answerPriceChange(request: FastifyRequest, approve: boolean): Promise<JobDto> {
    const user = await requireUser(ctx, request);
    const { id, pcId } = priceChangeParams.parse(request.params);
    const job = await loadJob(id, user);
    if (job.customerId !== user.id) throw new AppError('FORBIDDEN', 403);
    const pc = job.priceChanges.find((p) => p.id === pcId);
    if (!pc) throw notFound();

    const { count } = await prisma.priceChange.updateMany({
      where: { id: pcId, status: 'PENDING' },
      data: { status: approve ? 'APPROVED' : 'DECLINED', answeredAt: ctx.now() },
    });
    if (count === 0) throw conflict();

    const answer: Record<Language, string> = approve
      ? {
          'uz-Latn': `Yangi narx tasdiqlandi: ${formatSum(pc.newPrice)} so'm`,
          'uz-Cyrl': `Янги нарх тасдиқланди: ${formatSum(pc.newPrice)} сўм`,
          ru: `Новая цена подтверждена: ${formatSum(pc.newPrice)} сум`,
        }
      : {
          'uz-Latn': "Yangi narx rad etildi. Kelishilgan narx o'z kuchida.",
          'uz-Cyrl': 'Янги нарх рад этилди. Келишилган нарх ўз кучида.',
          ru: 'Новая цена отклонена. Действует согласованная цена.',
        };
    notifyInBackground(
      ctx,
      notifyUsers(
        ctx,
        [job.masterId],
        'priceChangeAnswered',
        (lang) => ({ answer: answer[lang] }),
        {
          type: 'job',
          jobId: id,
        },
      ),
    );
    return toJobDto(await loadJob(id, user), user.id, storage, endpoint(request));
  }

  app.post('/jobs/:id/price-changes/:pcId/approve', (request) => answerPriceChange(request, true));
  app.post('/jobs/:id/price-changes/:pcId/decline', (request) => answerPriceChange(request, false));
}
