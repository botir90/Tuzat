import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  enterReferralSchema,
  levelFor,
  upsertPromoCodeSchema,
  type BonusDto,
  type HomePromoDto,
} from '@usta/shared';
import { requireAdmin } from '../admin/auth';
import { requireUser } from '../auth/authenticate';
import type { AppContext } from '../context';
import { AppError, notFound } from '../lib/errors';
import { bonusBalance, ensureReferralCode, enterReferral, finishedOrders } from './service';

const idParams = z.object({ id: z.string().min(1) });

export function registerGrowthRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { prisma } = ctx;

  /** Bonus page (design/screens/Bonus.html). */
  app.get('/me/bonus', async (request): Promise<BonusDto> => {
    const user = await requireUser(ctx, request);
    const [balance, orders, referralCode, referred, earned] = await Promise.all([
      bonusBalance(prisma, user.id),
      finishedOrders(prisma, user.id),
      ensureReferralCode(ctx, user.id),
      prisma.user.count({ where: { referredById: user.id } }),
      prisma.bonusEntry.aggregate({
        where: { userId: user.id, kind: 'REFERRAL', sourceUserId: { not: user.id } },
        _sum: { amount: true },
      }),
    ]);
    return {
      balance,
      ...levelFor(orders),
      finishedOrders: orders,
      referralCode,
      referredCount: referred,
      referralEarned: earned._sum.amount ?? 0,
      canEnterReferral: !user.referredById && orders === 0,
    };
  });

  /** "Do you have a friend's code?" Once, before the first finished order. */
  app.post('/me/referral', async (request) => {
    const user = await requireUser(ctx, request);
    const { code } = enterReferralSchema.parse(request.body);
    await enterReferral(ctx, user.id, code);
    return { ok: true };
  });

  /** Promotions shown on the customer home screen. No login needed. */
  app.get('/promos/home', async (): Promise<HomePromoDto[]> => {
    const now = ctx.now();
    const promos = await prisma.promoCode.findMany({
      where: {
        isActive: true,
        showOnHome: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    return promos.map((p) => ({
      code: p.code,
      title: { 'uz-Latn': p.titleUzLatn, 'uz-Cyrl': p.titleUzCyrl, ru: p.titleRu },
      percent: p.percent,
      amount: p.amount,
      firstOrderOnly: p.firstOrderOnly,
    }));
  });

  // ---------- Admin: promo codes ----------

  app.get('/admin/promo-codes', async (request) => {
    await requireAdmin(ctx, request);
    const promos = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { redemptions: true } } },
    });
    return promos.map(({ _count, ...p }) => ({ ...p, used: _count.redemptions }));
  });

  const toData = (body: z.infer<typeof upsertPromoCodeSchema>) => ({
    ...body,
    startsAt: body.startsAt ? new Date(body.startsAt) : null,
    endsAt: body.endsAt ? new Date(body.endsAt) : null,
  });

  app.post('/admin/promo-codes', async (request, reply) => {
    await requireAdmin(ctx, request);
    const body = upsertPromoCodeSchema.parse(request.body);
    try {
      return reply.code(201).send(await prisma.promoCode.create({ data: toData(body) }));
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new AppError('CONFLICT', 409);
      throw error;
    }
  });

  app.put('/admin/promo-codes/:id', async (request) => {
    await requireAdmin(ctx, request);
    const { id } = idParams.parse(request.params);
    const body = upsertPromoCodeSchema.parse(request.body);
    if (!(await prisma.promoCode.findUnique({ where: { id } }))) throw notFound();
    try {
      return await prisma.promoCode.update({ where: { id }, data: toData(body) });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new AppError('CONFLICT', 409);
      throw error;
    }
  });
}
