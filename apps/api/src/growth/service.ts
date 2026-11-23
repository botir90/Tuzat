import {
  REFERRAL_BONUS,
  REVIEW_PHOTO_BONUS,
  bonusAllowed,
  levelFor,
  promoDiscount,
} from '@usta/shared';
import type { AppContext } from '../context';
import type { Prisma, PrismaClient } from '../generated/prisma/client';
import { AppError } from '../lib/errors';

type Db = PrismaClient | Prisma.TransactionClient;

export async function bonusBalance(db: Db, userId: string): Promise<number> {
  const { _sum } = await db.bonusEntry.aggregate({ where: { userId }, _sum: { amount: true } });
  return _sum.amount ?? 0;
}

export async function finishedOrders(db: Db, customerId: string): Promise<number> {
  return db.job.count({ where: { customerId, status: 'DONE' } });
}

/** Latin letters of the name, upper case: "Botir" → "BOTIR". */
function nameStem(name: string | null): string {
  const latin = (name ?? '')
    .normalize('NFKD')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 8);
  return latin.length >= 3 ? latin : 'USTA';
}

/** The customer's own invite code, created the first time it is needed (e.g. BOTIR30). */
export async function ensureReferralCode(ctx: AppContext, userId: string): Promise<string> {
  const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.referralCode) return user.referralCode;
  for (let attempt = 0; attempt < 20; attempt++) {
    const digits = attempt < 3 ? 30 + attempt * 11 : 100 + Math.floor(Math.random() * 900);
    const code = `${nameStem(user.name)}${digits}`;
    try {
      const updated = await ctx.prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      });
      return updated.referralCode!;
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error; // taken: try another
    }
  }
  throw new AppError('INTERNAL_ERROR', 500);
}

/** A new customer enters a friend's code once, before their first finished order. */
export async function enterReferral(ctx: AppContext, userId: string, code: string): Promise<void> {
  const [user, orders] = await Promise.all([
    ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    finishedOrders(ctx.prisma, userId),
  ]);
  if (user.referredById || orders > 0) throw new AppError('REFERRAL_NOT_ALLOWED', 409);
  const inviter = await ctx.prisma.user.findUnique({ where: { referralCode: code } });
  if (!inviter || inviter.id === userId) throw new AppError('REFERRAL_NOT_ALLOWED', 409);
  await ctx.prisma.user.updateMany({
    where: { id: userId, referredById: null },
    data: { referredById: inviter.id },
  });
}

/**
 * Discounts for an order, paid by the platform: a promo code and/or bonus (up to half).
 * Applied once per order; the bonus is taken from the account right away.
 */
export async function applyDiscounts(
  ctx: AppContext,
  input: {
    paymentId: string;
    jobId: string;
    customerId: string;
    total: number;
    promoCode?: string;
    useBonus?: boolean;
  },
): Promise<void> {
  const payment = await ctx.prisma.payment.findUniqueOrThrow({ where: { id: input.paymentId } });
  const already = payment.promoDiscount > 0 || payment.bonusUsed > 0;
  if (!input.promoCode && !input.useBonus) return;
  if (already) throw new AppError('DISCOUNT_ALREADY_APPLIED', 409);
  const now = ctx.now();

  let promo: { id: string; discount: number } | null = null;
  if (input.promoCode) {
    const found = await ctx.prisma.promoCode.findUnique({
      where: { code: input.promoCode },
      include: { _count: { select: { redemptions: true } } },
    });
    const live =
      found &&
      found.isActive &&
      (!found.startsAt || found.startsAt <= now) &&
      (!found.endsAt || found.endsAt > now) &&
      (found.usageLimit === null || found._count.redemptions < found.usageLimit);
    if (!found || !live) throw new AppError('PROMO_NOT_FOUND', 404);
    if (found.firstOrderOnly && (await finishedOrders(ctx.prisma, input.customerId)) > 0) {
      throw new AppError('PROMO_FIRST_ORDER_ONLY', 409);
    }
    promo = { id: found.id, discount: promoDiscount(found, input.total) };
  }

  await ctx.prisma.$transaction(async (tx) => {
    const promoAmount = promo?.discount ?? 0;
    const bonus = input.useBonus
      ? bonusAllowed(input.total - promoAmount, await bonusBalance(tx, input.customerId))
      : 0;
    if (promo) {
      try {
        await tx.promoRedemption.create({
          data: {
            promoCodeId: promo.id,
            userId: input.customerId,
            jobId: input.jobId,
            discount: promoAmount,
            createdAt: now,
          },
        });
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') {
          throw new AppError('PROMO_ALREADY_USED', 409);
        }
        throw error;
      }
    }
    if (bonus > 0) {
      await tx.bonusEntry.create({
        data: {
          userId: input.customerId,
          kind: 'SPENT',
          amount: -bonus,
          jobId: input.jobId,
          createdAt: now,
        },
      });
    }
    const { count } = await tx.payment.updateMany({
      where: { id: input.paymentId, promoDiscount: 0, bonusUsed: 0 },
      data: { promoCodeId: promo?.id ?? null, promoDiscount: promoAmount, bonusUsed: bonus },
    });
    if (count === 0) throw new AppError('DISCOUNT_ALREADY_APPLIED', 409);
  });
}

/** The job was cancelled: spent bonus comes back and the promo code can be used again. */
export async function undoDiscounts(ctx: AppContext, jobId: string): Promise<void> {
  const payment = await ctx.prisma.payment.findUnique({ where: { jobId }, include: { job: true } });
  if (!payment) return;
  await ctx.prisma.$transaction(async (tx) => {
    if (payment.bonusUsed > 0) {
      await tx.bonusEntry.create({
        data: {
          userId: payment.job.customerId,
          kind: 'REFUND',
          amount: payment.bonusUsed,
          jobId,
          createdAt: ctx.now(),
        },
      });
    }
    await tx.promoRedemption.deleteMany({ where: { jobId } });
    await tx.payment.update({
      where: { id: payment.id },
      data: { promoCodeId: null, promoDiscount: 0, bonusUsed: 0 },
    });
  });
}

/** Platform-paid discounts are owed to the master: they reduce the master's balance. */
export async function creditDiscountToMaster(
  ctx: AppContext,
  input: { masterId: string; jobId: string; amount: number },
): Promise<void> {
  if (input.amount <= 0) return;
  await ctx.prisma.$transaction(async (tx) => {
    await tx.balanceEntry.create({
      data: {
        masterId: input.masterId,
        jobId: input.jobId,
        kind: 'DISCOUNT_CREDIT',
        amount: -input.amount,
        createdAt: ctx.now(),
      },
    });
    await tx.masterBalance.upsert({
      where: { masterId: input.masterId },
      create: { masterId: input.masterId, owed: -input.amount },
      update: { owed: { decrement: input.amount } },
    });
  });
}

/** Online payment released: cashback by the customer's level. */
export async function giveCashback(
  ctx: AppContext,
  customerId: string,
  jobId: string,
  paid: number,
) {
  if (paid <= 0) return;
  const { cashbackPercent } = levelFor(await finishedOrders(ctx.prisma, customerId));
  const amount = Math.round((paid * cashbackPercent) / 100);
  if (amount <= 0) return;
  await ctx.prisma.bonusEntry.create({
    data: { userId: customerId, kind: 'CASHBACK', amount, jobId, createdAt: ctx.now() },
  });
}

/** A review with a photo earns a small bonus (once per job). */
export async function giveReviewPhotoBonus(ctx: AppContext, customerId: string, jobId: string) {
  const exists = await ctx.prisma.bonusEntry.findFirst({
    where: { userId: customerId, jobId, kind: 'REVIEW_PHOTO' },
  });
  if (exists) return;
  await ctx.prisma.bonusEntry.create({
    data: {
      userId: customerId,
      kind: 'REVIEW_PHOTO',
      amount: REVIEW_PHOTO_BONUS,
      jobId,
      createdAt: ctx.now(),
    },
  });
}

/**
 * The customer's first finished order: if a friend invited them, both get the referral
 * bonus. Each invited friend pays out once.
 */
export async function rewardReferral(ctx: AppContext, customerId: string, jobId: string) {
  const customer = await ctx.prisma.user.findUnique({ where: { id: customerId } });
  if (!customer?.referredById) return;
  if ((await finishedOrders(ctx.prisma, customerId)) !== 1) return;
  const paid = await ctx.prisma.bonusEntry.findFirst({
    where: { kind: 'REFERRAL', sourceUserId: customerId },
  });
  if (paid) return;
  const now = ctx.now();
  await ctx.prisma.bonusEntry.createMany({
    data: [
      {
        userId: customer.referredById,
        kind: 'REFERRAL',
        amount: REFERRAL_BONUS,
        jobId,
        sourceUserId: customerId,
        createdAt: now,
      },
      {
        userId: customerId,
        kind: 'REFERRAL',
        amount: REFERRAL_BONUS,
        jobId,
        sourceUserId: customerId,
        createdAt: now,
      },
    ],
  });
}
