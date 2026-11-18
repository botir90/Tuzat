import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  adminMastersQuerySchema,
  adminUsersQuerySchema,
  rejectMasterSchema,
  type AdminMasterRow,
  type AdminPage,
  type AdminUserRow,
} from '@usta/shared';
import type { AppContext } from '../context';
import type { Prisma } from '../generated/prisma/client';
import { notFound } from '../lib/errors';
import { notifyInBackground, notifyUsers } from '../push/notify';
import { publicStorageEndpoint } from '../storage/public-endpoint';
import { requireAdmin } from './auth';
import { pageArgs, toPage } from './paging';

const userParams = z.object({ userId: z.string().min(1) });

const masterInclude = {
  user: true,
  categories: { orderBy: { sortOrder: 'asc' } },
  districts: { orderBy: { sortOrder: 'asc' } },
} as const;

/** Masters (verification) and app users (blocking). */
export function registerAdminPeopleRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { prisma, storage } = ctx;

  app.get('/admin/masters', async (request): Promise<AdminPage<AdminMasterRow>> => {
    await requireAdmin(ctx, request);
    const { status, cursor, limit } = adminMastersQuerySchema.parse(request.query);
    // MasterProfile has no own id: page by userId.
    const rows = await prisma.masterProfile.findMany({
      where: status ? { verificationStatus: status } : {},
      take: limit + 1,
      ...(cursor ? { cursor: { userId: cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { userId: 'desc' }],
      include: masterInclude,
    });
    const endpoint = publicStorageEndpoint(ctx.env, request);
    const items = await Promise.all(
      rows.slice(0, limit).map(async (p): Promise<AdminMasterRow> => ({
        userId: p.userId,
        name: p.user.name,
        phone: p.user.phone,
        photoUrl: p.photoKey ? await storage.presignDownload(p.photoKey, endpoint) : null,
        bio: p.bio,
        verificationStatus: p.verificationStatus,
        rejectionReason: p.rejectionReason,
        isAvailable: p.isAvailable,
        isBlocked: p.user.isBlocked,
        ratingAvg: p.ratingAvg,
        ratingCount: p.ratingCount,
        completedJobsCount: p.completedJobsCount,
        categories: p.categories.map((c) => c.nameUzLatn),
        districts: p.districts.map((d) => d.nameUzLatn),
        workPhotoUrls: await Promise.all(
          p.workPhotoKeys.map((key) => storage.presignDownload(key, endpoint)),
        ),
        createdAt: p.createdAt.toISOString(),
      })),
    );
    const last = rows.slice(0, limit).at(-1);
    return { items, nextCursor: rows.length > limit && last ? last.userId : null };
  });

  app.post('/admin/masters/:userId/verify', async (request, reply) => {
    await requireAdmin(ctx, request);
    const { userId } = userParams.parse(request.params);
    const { count } = await prisma.masterProfile.updateMany({
      where: { userId },
      data: { verificationStatus: 'VERIFIED', rejectionReason: null },
    });
    if (count === 0) throw notFound();
    notifyInBackground(
      ctx,
      notifyUsers(ctx, [userId], 'masterVerified', () => ({}), { type: 'master' }),
    );
    return reply.code(204).send();
  });

  app.post('/admin/masters/:userId/reject', async (request, reply) => {
    await requireAdmin(ctx, request);
    const { userId } = userParams.parse(request.params);
    const { reason } = rejectMasterSchema.parse(request.body);
    const { count } = await prisma.masterProfile.updateMany({
      where: { userId },
      data: { verificationStatus: 'REJECTED', rejectionReason: reason },
    });
    if (count === 0) throw notFound();
    notifyInBackground(
      ctx,
      notifyUsers(ctx, [userId], 'masterRejected', () => ({ reason }), { type: 'master' }),
    );
    return reply.code(204).send();
  });

  app.get('/admin/users', async (request): Promise<AdminPage<AdminUserRow>> => {
    await requireAdmin(ctx, request);
    const { phone, cursor, limit } = adminUsersQuerySchema.parse(request.query);
    const digits = phone?.replace(/\D/g, '');
    const where: Prisma.UserWhereInput = digits ? { phone: { contains: digits } } : {};
    const rows = await prisma.user.findMany({ where, ...pageArgs(cursor, limit) });
    return toPage(
      rows,
      limit,
      (u) => ({
        id: u.id,
        phone: u.phone,
        name: u.name,
        role: u.role,
        isBlocked: u.isBlocked,
        createdAt: u.createdAt.toISOString(),
      }),
      (u) => u.id,
    );
  });

  /** Blocking also ends every session of the user immediately. */
  app.post('/admin/users/:userId/block', async (request, reply) => {
    await requireAdmin(ctx, request);
    const { userId } = userParams.parse(request.params);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound();
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { isBlocked: true } }),
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: ctx.now() },
      }),
      // A blocked master must not appear in feeds or availability.
      prisma.masterProfile.updateMany({ where: { userId }, data: { isAvailable: false } }),
    ]);
    return reply.code(204).send();
  });

  app.post('/admin/users/:userId/unblock', async (request, reply) => {
    await requireAdmin(ctx, request);
    const { userId } = userParams.parse(request.params);
    const { count } = await prisma.user.updateMany({
      where: { id: userId },
      data: { isBlocked: false },
    });
    if (count === 0) throw notFound();
    return reply.code(204).send();
  });
}
