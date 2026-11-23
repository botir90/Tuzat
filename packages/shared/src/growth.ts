import { z } from 'zod';
import { localizedTextSchema } from './catalog';

// ---------- Bonuses and levels (design/screens/Bonus.html) ----------

export const BONUS_LEVELS = ['BRONZE', 'SILVER', 'GOLD'] as const;
export type BonusLevel = (typeof BONUS_LEVELS)[number];

/** Level by finished orders, and its cashback percent (online payments). */
export const LEVEL_RULES: { level: BonusLevel; fromOrders: number; cashbackPercent: number }[] = [
  { level: 'BRONZE', fromOrders: 0, cashbackPercent: 3 },
  { level: 'SILVER', fromOrders: 5, cashbackPercent: 5 },
  { level: 'GOLD', fromOrders: 15, cashbackPercent: 7 },
];

export function levelFor(finishedOrders: number) {
  // The highest level whose threshold is reached (rules are sorted by fromOrders).
  const index = LEVEL_RULES.filter((r) => finishedOrders >= r.fromOrders).length - 1;
  const current = LEVEL_RULES[Math.max(0, index)]!;
  const next = LEVEL_RULES[index + 1] ?? null;
  return {
    level: current.level,
    cashbackPercent: current.cashbackPercent,
    nextLevel: next?.level ?? null,
    nextCashbackPercent: next?.cashbackPercent ?? null,
    ordersToNext: next ? next.fromOrders - finishedOrders : null,
  };
}

/** Both the inviter and the friend get this after the friend's first finished order. */
export const REFERRAL_BONUS = 30_000;
/** For a review with a photo of the finished work. */
export const REVIEW_PHOTO_BONUS = 3_000;
/** Bonus can pay at most this part of an order. */
export const MAX_BONUS_SHARE = 0.5;

/** How much bonus may pay for an order of `total` with `balance` on the account. */
export const bonusAllowed = (total: number, balance: number) =>
  Math.max(0, Math.min(balance, Math.floor(total * MAX_BONUS_SHARE)));

export const bonusDtoSchema = z.object({
  balance: z.number().int(),
  level: z.enum(BONUS_LEVELS),
  cashbackPercent: z.number(),
  nextLevel: z.enum(BONUS_LEVELS).nullable(),
  nextCashbackPercent: z.number().nullable(),
  ordersToNext: z.number().int().nullable(),
  finishedOrders: z.number().int(),
  referralCode: z.string(),
  referredCount: z.number().int(),
  referralEarned: z.number().int(),
  /** The user may still enter a friend's code (not invited yet, no finished order). */
  canEnterReferral: z.boolean(),
});
export type BonusDto = z.infer<typeof bonusDtoSchema>;

export const enterReferralSchema = z.object({
  code: z.string().trim().toUpperCase().min(3).max(20),
});

// ---------- Promo codes ----------

/** A promotion shown on the customer home screen (admin-managed). */
export const homePromoDtoSchema = z.object({
  code: z.string(),
  title: localizedTextSchema,
  percent: z.number().int().nullable(),
  amount: z.number().int().nullable(),
  firstOrderOnly: z.boolean(),
});
export type HomePromoDto = z.infer<typeof homePromoDtoSchema>;

/** Discount of a promo code for an order of `total`. */
export function promoDiscount(
  promo: { percent: number | null; amount: number | null; maxDiscount: number | null },
  total: number,
): number {
  const raw = promo.percent ? Math.round((total * promo.percent) / 100) : (promo.amount ?? 0);
  const capped = promo.maxDiscount ? Math.min(raw, promo.maxDiscount) : raw;
  return Math.max(0, Math.min(capped, total));
}

export const upsertPromoCodeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{3,20}$/, 'PROMO_CODE_FORMAT'),
    titleUzLatn: z.string().trim().min(2).max(120),
    titleUzCyrl: z.string().trim().min(2).max(120),
    titleRu: z.string().trim().min(2).max(120),
    percent: z.number().int().min(1).max(100).nullable(),
    amount: z.number().int().min(1000).nullable(),
    maxDiscount: z.number().int().min(1000).nullable(),
    firstOrderOnly: z.boolean(),
    showOnHome: z.boolean(),
    isActive: z.boolean(),
    startsAt: z.iso.datetime().nullable(),
    endsAt: z.iso.datetime().nullable(),
    usageLimit: z.number().int().min(1).nullable(),
  })
  .refine((v) => (v.percent === null) !== (v.amount === null), {
    message: 'PERCENT_OR_AMOUNT',
    path: ['percent'],
  });
export type UpsertPromoCodeBody = z.infer<typeof upsertPromoCodeSchema>;
