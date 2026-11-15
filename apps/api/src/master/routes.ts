import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  MAX_OFFERS_PER_REQUEST,
  availabilityBodySchema,
  createOfferSchema,
  formatSum,
  masterProfileBodySchema,
  pushTokenBodySchema,
  type FeedItemDto,
  type MasterProfileDto,
  type OfferDto,
} from '@usta/shared';
import { requireUser } from '../auth/authenticate';
import { names } from '../catalog/dto';
import type { AppContext } from '../context';
import type { Prisma, User } from '../generated/prisma/client';
import { AppError, conflict, notFound } from '../lib/errors';
import { notifyInBackground, notifyUsers } from '../push/notify';
import { requestInclude, toRequestDto } from '../requests/dto';
import { expireOldRequests } from '../requests/expire';
import { publicStorageEndpoint } from '../storage/public-endpoint';
import { assertUpload } from '../storage/uploads';
import { profileInclude, toMasterProfileDto, toOfferDto } from './dto';

const idParams = z.object({ id: z.string().min(1) });
/** Offers that count towards the 5-per-request limit. */
const ACTIVE_OFFER_STATUSES = ['SENT', 'ACCEPTED'] as const;

export function registerMasterRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { prisma, storage } = ctx;

  async function requireMaster(request: FastifyRequest): Promise<User> {
    const user = await requireUser(ctx, request);
    if (user.role !== 'MASTER') throw new AppError('NOT_A_MASTER', 403);
    return user;
  }

  /** Profile that may see and answer requests: verified and switched on. */
  async function requireWorkingMaster(request: FastifyRequest) {
    const user = await requireMaster(request);
    const profile = await prisma.masterProfile.findUnique({
      where: { userId: user.id },
      include: { categories: { select: { id: true } }, districts: { select: { id: true } } },
    });
    if (!profile || profile.verificationStatus !== 'VERIFIED') {
      throw new AppError('MASTER_NOT_VERIFIED', 403);
    }
    if (!profile.isAvailable) throw new AppError('MASTER_NOT_AVAILABLE', 403);
    return { user, profile };
  }

  /** Business rule: a master sees only OPEN requests in their categories and districts. */
  function visibleRequestsWhere(
    userId: string,
    profile: { categories: { id: string }[]; districts: { id: string }[] },
  ): Prisma.RequestWhereInput {
    return {
      status: 'OPEN',
      expiresAt: { gt: ctx.now() },
      customerId: { not: userId },
      categoryId: { in: profile.categories.map((c) => c.id) },
      districtId: { in: profile.districts.map((d) => d.id) },
    };
  }

  /** Typical price range for the request card (with the region's own prices if set). */
  async function priceRange(categoryId: string, regionId: string) {
    const items = await prisma.priceItem.findMany({
      where: { categoryId },
      include: { regionOverrides: { where: { regionId } } },
    });
    if (items.length === 0) return null;
    const mins = items.map((i) => i.regionOverrides[0]?.minPrice ?? i.minPrice);
    const maxs = items.map((i) => i.regionOverrides[0]?.maxPrice ?? i.maxPrice);
    return { min: Math.min(...mins), max: Math.max(...maxs) };
  }

  async function toFeedItem(
    row: Awaited<ReturnType<typeof loadRequestForMaster>>,
    masterId: string,
    endpoint: string,
  ): Promise<FeedItemDto> {
    if (!row) throw notFound();
    const myOffer = row.offers.find((o) => o.masterId === masterId) ?? null;
    const activeOffers = row.offers.filter((o) =>
      (ACTIVE_OFFER_STATUSES as readonly string[]).includes(o.status),
    ).length;
    const base = await toRequestDto(row, storage, endpoint, {
      // Privacy: exact address only for the master whose offer was accepted.
      revealAddress: myOffer?.status === 'ACCEPTED',
      offerCount: activeOffers,
    });
    return {
      ...base,
      priceRange: await priceRange(row.categoryId, row.district.regionId),
      myOffer: myOffer ? toOfferDto(myOffer) : null,
    };
  }

  function loadRequestForMaster(where: Prisma.RequestWhereInput) {
    return prisma.request.findFirst({ where, include: { ...requestInclude, offers: true } });
  }

  // ---------- Profile ----------

  app.get('/master/profile', async (request): Promise<MasterProfileDto> => {
    const user = await requireMaster(request);
    const profile = await prisma.masterProfile.findUnique({
      where: { userId: user.id },
      include: profileInclude,
    });
    if (!profile) throw notFound();
    return toMasterProfileDto(profile, storage, publicStorageEndpoint(ctx.env, request));
  });

  /** Onboarding and editing. A rejected profile goes back to "waiting for verification". */
  app.put('/master/profile', async (request): Promise<MasterProfileDto> => {
    const user = await requireMaster(request);
    const body = masterProfileBodySchema.parse(request.body);

    const [categories, districts] = await Promise.all([
      prisma.category.findMany({ where: { id: { in: body.categoryIds }, isActive: true } }),
      prisma.district.findMany({ where: { id: { in: body.districtIds } } }),
    ]);
    if (categories.length !== new Set(body.categoryIds).size) throw notFound();
    if (districts.length !== new Set(body.districtIds).size) throw notFound();

    const existing = await prisma.masterProfile.findUnique({ where: { userId: user.id } });
    // Files already saved in the profile don't need to be checked again.
    const known = new Set([...(existing?.workPhotoKeys ?? []), existing?.photoKey]);
    await Promise.all([
      body.photoKey && !known.has(body.photoKey)
        ? assertUpload(storage, user.id, 'master-photo', body.photoKey)
        : undefined,
      ...body.workPhotoKeys
        .filter((key) => !known.has(key))
        .map((key) => assertUpload(storage, user.id, 'master-work', key)),
    ]);

    const data = {
      photoKey: body.photoKey ?? null,
      bio: body.bio || null,
      workPhotoKeys: body.workPhotoKeys,
      categories: { set: body.categoryIds.map((id) => ({ id })) },
      districts: { set: body.districtIds.map((id) => ({ id })) },
    };
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { name: body.name } }),
      existing
        ? prisma.masterProfile.update({
            where: { userId: user.id },
            data: {
              ...data,
              ...(existing.verificationStatus === 'REJECTED'
                ? { verificationStatus: 'PENDING' as const, rejectionReason: null }
                : {}),
            },
          })
        : prisma.masterProfile.create({
            data: {
              ...data,
              user: { connect: { id: user.id } },
              categories: { connect: body.categoryIds.map((id) => ({ id })) },
              districts: { connect: body.districtIds.map((id) => ({ id })) },
            },
          }),
    ]);

    const profile = await prisma.masterProfile.findUniqueOrThrow({
      where: { userId: user.id },
      include: profileInclude,
    });
    return toMasterProfileDto(profile, storage, publicStorageEndpoint(ctx.env, request));
  });

  app.put('/master/availability', async (request): Promise<MasterProfileDto> => {
    const user = await requireMaster(request);
    const { isAvailable } = availabilityBodySchema.parse(request.body);
    const existing = await prisma.masterProfile.findUnique({ where: { userId: user.id } });
    if (!existing) throw notFound();
    const profile = await prisma.masterProfile.update({
      where: { userId: user.id },
      data: { isAvailable },
      include: profileInclude,
    });
    return toMasterProfileDto(profile, storage, publicStorageEndpoint(ctx.env, request));
  });

  // ---------- Feed and offers ----------

  /** New requests in my categories and districts, newest first. */
  app.get('/master/feed', async (request): Promise<FeedItemDto[]> => {
    const { user, profile } = await requireWorkingMaster(request);
    await expireOldRequests(prisma, ctx.now());
    const rows = await prisma.request.findMany({
      where: visibleRequestsWhere(user.id, profile),
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { ...requestInclude, offers: true },
    });
    const endpoint = publicStorageEndpoint(ctx.env, request);
    const items = await Promise.all(rows.map((row) => toFeedItem(row, user.id, endpoint)));
    // Requests that already have 5 offers are full (unless I'm one of them).
    return items.filter((i) => i.myOffer || i.offerCount < MAX_OFFERS_PER_REQUEST);
  });

  app.get('/master/requests/:id', async (request): Promise<FeedItemDto> => {
    const user = await requireMaster(request);
    const { id } = idParams.parse(request.params);
    await expireOldRequests(prisma, ctx.now());

    // Either a request I already answered, or one I'm allowed to see in the feed.
    let row = await loadRequestForMaster({ id, offers: { some: { masterId: user.id } } });
    if (!row) {
      const { profile } = await requireWorkingMaster(request);
      row = await loadRequestForMaster({ id, ...visibleRequestsWhere(user.id, profile) });
    }
    if (!row) throw notFound();
    return toFeedItem(row, user.id, publicStorageEndpoint(ctx.env, request));
  });

  app.post('/master/requests/:id/offers', async (request, reply) => {
    const { user, profile } = await requireWorkingMaster(request);
    const { id } = idParams.parse(request.params);
    const body = createOfferSchema.parse(request.body);
    const now = ctx.now();
    await expireOldRequests(prisma, now);

    const arrivalAt = new Date(body.arrivalAt);
    if (arrivalAt.getTime() < now.getTime() - 5 * 60_000) {
      throw new AppError('VALIDATION_ERROR', 400);
    }

    const target = await prisma.request.findUnique({
      where: { id },
      include: { category: true, district: true },
    });
    if (!target) throw notFound();
    const visible = await prisma.request.count({
      where: { id, ...visibleRequestsWhere(user.id, profile) },
    });
    if (visible === 0) {
      throw target.status === 'OPEN' && target.expiresAt > now
        ? notFound()
        : new AppError('REQUEST_NOT_OPEN', 409);
    }

    const offer = await prisma.$transaction(async (tx) => {
      const mine = await tx.offer.findUnique({
        where: { requestId_masterId: { requestId: id, masterId: user.id } },
      });
      if (mine && mine.status !== 'WITHDRAWN') throw new AppError('OFFER_ALREADY_SENT', 409);

      // Business rule: max 5 offers per request.
      const active = await tx.offer.count({
        where: { requestId: id, status: { in: [...ACTIVE_OFFER_STATUSES] } },
      });
      if (active >= MAX_OFFERS_PER_REQUEST) throw new AppError('TOO_MANY_OFFERS', 409);

      const data = {
        price: body.price,
        arrivalAt,
        message: body.message || null,
        status: 'SENT' as const,
      };
      return mine
        ? tx.offer.update({ where: { id: mine.id }, data })
        : tx.offer.create({ data: { ...data, requestId: id, masterId: user.id } });
    });

    notifyInBackground(
      ctx,
      notifyUsers(
        ctx,
        [target.customerId],
        'newOffer',
        () => ({ master: user.name ?? '', price: formatSum(offer.price) }),
        { type: 'request', requestId: id },
      ),
    );
    return reply.code(201).send(toOfferDto(offer));
  });

  app.post('/master/offers/:id/withdraw', async (request): Promise<OfferDto> => {
    const user = await requireMaster(request);
    const { id } = idParams.parse(request.params);
    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer || offer.masterId !== user.id) throw notFound();
    if (offer.status !== 'SENT') throw conflict();
    const updated = await prisma.offer.update({ where: { id }, data: { status: 'WITHDRAWN' } });
    return toOfferDto(updated);
  });

  /** Requests I sent offers to, newest first. */
  app.get('/master/offers', async (request): Promise<FeedItemDto[]> => {
    const user = await requireMaster(request);
    await expireOldRequests(prisma, ctx.now());
    const rows = await prisma.request.findMany({
      where: { offers: { some: { masterId: user.id } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { ...requestInclude, offers: true },
    });
    const endpoint = publicStorageEndpoint(ctx.env, request);
    return Promise.all(rows.map((row) => toFeedItem(row, user.id, endpoint)));
  });

  // ---------- Push tokens (any logged-in user) ----------

  app.post('/push-tokens', async (request, reply) => {
    const user = await requireUser(ctx, request);
    const { token, platform } = pushTokenBodySchema.parse(request.body);
    // A phone can change owner (logout/login): the token always belongs to the last user.
    await prisma.pushToken.upsert({
      where: { token },
      update: { userId: user.id, platform },
      create: { token, platform, userId: user.id },
    });
    return reply.code(204).send();
  });

  app.delete('/push-tokens', async (request, reply) => {
    const user = await requireUser(ctx, request);
    const { token } = z.object({ token: z.string().min(1) }).parse(request.body);
    await prisma.pushToken.deleteMany({ where: { token, userId: user.id } });
    return reply.code(204).send();
  });
}

/** Tells verified, available masters about a new request in their area. */
export async function notifyMastersAboutRequest(ctx: AppContext, requestId: string): Promise<void> {
  const request = await ctx.prisma.request.findUnique({
    where: { id: requestId },
    include: { category: true, district: true },
  });
  if (!request) return;
  const masters = await ctx.prisma.masterProfile.findMany({
    where: {
      verificationStatus: 'VERIFIED',
      isAvailable: true,
      userId: { not: request.customerId },
      categories: { some: { id: request.categoryId } },
      districts: { some: { id: request.districtId } },
    },
    select: { userId: true },
  });
  await notifyUsers(
    ctx,
    masters.map((m) => m.userId),
    'newRequest',
    (language) => ({
      category: names(request.category)[language],
      district: names(request.district)[language],
    }),
    { type: 'feed', requestId },
  );
}
