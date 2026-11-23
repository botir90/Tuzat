import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  createComplaintSchema,
  createGuaranteeClaimSchema,
  createReviewSchema,
  type ComplaintDto,
  type JobDto,
  type MasterPublicDto,
} from '@usta/shared';
import { requireUser } from '../auth/authenticate';
import { names } from '../catalog/dto';
import type { AppContext } from '../context';
import type { Prisma, User } from '../generated/prisma/client';
import { jobInclude, toJobDto, toMasterCard } from '../jobs/dto';
import { AppError, notFound } from '../lib/errors';
import { notifyInBackground, notifyUsers } from '../push/notify';
import { publicStorageEndpoint } from '../storage/public-endpoint';
import { assertUpload } from '../storage/uploads';
import { reviewInclude, toComplaintDto, toReviewDto } from './dto';

const idParams = z.object({ id: z.string().min(1) });

/** A user may have at most this many open complaints about one job (stops spamming). */
const MAX_OPEN_COMPLAINTS_PER_JOB = 3;
const PUBLIC_REVIEWS_LIMIT = 50;
/** Prices shown on a master's page. */
const MASTER_PRICES_LIMIT = 5;

/**
 * Recomputes a master's rating from all their reviews.
 * Done from the database (not "old average + new star") so it can never drift.
 */
async function refreshMasterRating(tx: Prisma.TransactionClient, masterId: string): Promise<void> {
  const stats = await tx.review.aggregate({
    where: { masterId },
    _avg: { stars: true },
    _count: { _all: true },
  });
  await tx.masterProfile.updateMany({
    where: { userId: masterId },
    data: {
      ratingAvg: Math.round((stats._avg.stars ?? 0) * 10) / 10,
      ratingCount: stats._count._all,
    },
  });
}

export function registerTrustRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { prisma, storage } = ctx;
  const endpoint = (request: FastifyRequest) => publicStorageEndpoint(ctx.env, request);

  async function loadJob(id: string, user: User) {
    const job = await prisma.job.findUnique({ where: { id }, include: jobInclude });
    if (!job || (job.customerId !== user.id && job.masterId !== user.id)) throw notFound();
    return job;
  }

  async function jobResponse(id: string, user: User, request: FastifyRequest): Promise<JobDto> {
    return toJobDto(await loadJob(id, user), user.id, storage, endpoint(request), ctx.now());
  }

  // ---------- Reviews ----------

  /** Business rule: only the customer of a DONE job can review it, and only once. */
  app.post('/jobs/:id/review', async (request, reply) => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    const body = createReviewSchema.parse(request.body);
    const job = await loadJob(id, user);

    if (job.customerId !== user.id) throw new AppError('FORBIDDEN', 403);
    if (job.status !== 'DONE') throw new AppError('JOB_NOT_DONE', 409);
    if (job.review) throw new AppError('REVIEW_ALREADY_EXISTS', 409);
    await Promise.all(
      body.photoKeys.map((key) => assertUpload(storage, user.id, 'review-photo', key)),
    );

    try {
      await prisma.$transaction(async (tx) => {
        await tx.review.create({
          data: {
            jobId: id,
            customerId: user.id,
            masterId: job.masterId,
            stars: body.stars,
            comment: body.comment || null,
            photoKeys: body.photoKeys,
            createdAt: ctx.now(),
          },
        });
        await refreshMasterRating(tx, job.masterId);
      });
    } catch (error) {
      // Two quick taps: the unique jobId constraint stops the second review.
      if ((error as { code?: string }).code === 'P2002') {
        throw new AppError('REVIEW_ALREADY_EXISTS', 409);
      }
      throw error;
    }

    notifyInBackground(
      ctx,
      notifyUsers(
        ctx,
        [job.masterId],
        'newReview',
        (lang) => ({ stars: String(body.stars), category: names(job.request.category)[lang] }),
        { type: 'job', jobId: id },
      ),
    );
    return reply.code(201).send(await jobResponse(id, user, request));
  });

  /** A verified master's public page with ALL reviews, including negative ones. */
  app.get('/masters/:id', async (request): Promise<MasterPublicDto> => {
    const { id } = idParams.parse(request.params);
    const master = await prisma.user.findUnique({
      where: { id },
      include: {
        masterProfile: {
          include: {
            categories: { orderBy: { sortOrder: 'asc' } },
            districts: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });
    const profile = master?.masterProfile;
    if (!master || !profile || profile.verificationStatus !== 'VERIFIED' || master.isBlocked) {
      throw notFound();
    }

    const reviews = await prisma.review.findMany({
      where: { masterId: id },
      orderBy: { createdAt: 'desc' },
      take: PUBLIC_REVIEWS_LIMIT,
      include: reviewInclude,
    });
    // Region prices of the region the master works in (the first district's).
    const regionId = profile.districts[0]?.regionId ?? '';
    const priceItems = await prisma.priceItem.findMany({
      where: { categoryId: { in: profile.categories.map((c) => c.id) } },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      take: MASTER_PRICES_LIMIT,
      include: { regionOverrides: { where: { regionId } } },
    });
    const publicEndpoint = endpoint(request);
    return {
      master: await toMasterCard(master, storage, publicEndpoint),
      bio: profile.bio,
      categories: profile.categories.map((c) => ({ id: c.id, name: names(c) })),
      districts: profile.districts.map((d) => names(d)),
      prices: priceItems.map((p) => ({
        id: p.id,
        name: names(p),
        minPrice: p.regionOverrides[0]?.minPrice ?? p.minPrice,
      })),
      workPhotoUrls: await Promise.all(
        profile.workPhotoKeys.map((key) => storage.presignDownload(key, publicEndpoint)),
      ),
      reviews: await Promise.all(reviews.map((r) => toReviewDto(r, storage, publicEndpoint))),
    };
  });

  // ---------- Guarantee ----------

  /** "The problem came back": allowed for the customer while the guarantee lasts. */
  app.post('/jobs/:id/guarantee-claims', async (request, reply) => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    const { description } = createGuaranteeClaimSchema.parse(request.body);
    const job = await loadJob(id, user);
    const now = ctx.now();

    if (job.customerId !== user.id) throw new AppError('FORBIDDEN', 403);
    if (job.status !== 'DONE') throw new AppError('JOB_NOT_DONE', 409);
    if (!job.guaranteeUntil || job.guaranteeUntil <= now) {
      throw new AppError('GUARANTEE_EXPIRED', 409);
    }
    if (job.guaranteeClaims.some((c) => c.status === 'OPEN')) {
      throw new AppError('CLAIM_ALREADY_OPEN', 409);
    }

    await prisma.guaranteeClaim.create({ data: { jobId: id, description, createdAt: now } });
    notifyInBackground(
      ctx,
      notifyUsers(
        ctx,
        [job.masterId],
        'guaranteeClaim',
        (lang) => ({ category: names(job.request.category)[lang] }),
        { type: 'job', jobId: id },
      ),
    );
    return reply.code(201).send(await jobResponse(id, user, request));
  });

  // ---------- Complaints ----------

  /** Either side can complain about a job; an admin handles it in the panel. */
  app.post('/jobs/:id/complaints', async (request, reply) => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    const { text } = createComplaintSchema.parse(request.body);
    await loadJob(id, user);

    const open = await prisma.complaint.count({
      where: { jobId: id, fromUserId: user.id, status: 'OPEN' },
    });
    if (open >= MAX_OPEN_COMPLAINTS_PER_JOB) throw new AppError('CONFLICT', 409);

    const complaint = await prisma.complaint.create({
      data: { jobId: id, fromUserId: user.id, text, createdAt: ctx.now() },
    });
    return reply.code(201).send(toComplaintDto(complaint));
  });

  /** My complaints about a job (so the app can show "we received it"). */
  app.get('/jobs/:id/complaints', async (request): Promise<ComplaintDto[]> => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    await loadJob(id, user);
    const complaints = await prisma.complaint.findMany({
      where: { jobId: id, fromUserId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    return complaints.map(toComplaintDto);
  });
}
