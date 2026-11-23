import { AUTO_RELEASE_HOURS, type PaymentMethod } from '@usta/shared';
import type { AppContext } from '../context';
import type { Hold, Prisma, PrismaClient } from '../generated/prisma/client';
import { AppError } from '../lib/errors';
import { notifyInBackground, notifyUsers } from '../push/notify';

type Db = PrismaClient | Prisma.TransactionClient;

const DAY_MS = 24 * 60 * 60 * 1000;
/** Remind the customer this long before the automatic release. */
const REMINDER_BEFORE_MS = 4 * 60 * 60 * 1000;
const ACTIVE_JOB = ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS'];

const sum = (holds: Pick<Hold, 'amount'>[]) => holds.reduce((total, h) => total + h.amount, 0);

/**
 * Commission of a job: COMMISSION_PERCENT of the labor, 0 while the master is in the
 * first free days (counted from when they joined as a master).
 */
export async function commissionRate(ctx: AppContext, masterId: string, at: Date) {
  const profile = await ctx.prisma.masterProfile.findUnique({ where: { userId: masterId } });
  const freeUntil =
    profile && ctx.env.COMMISSION_FREE_DAYS > 0
      ? new Date(profile.createdAt.getTime() + ctx.env.COMMISSION_FREE_DAYS * DAY_MS)
      : null;
  const percent = freeUntil && at < freeUntil ? 0 : ctx.env.COMMISSION_PERCENT;
  return { percent, freeUntil };
}

export const commissionOf = (labor: number, percent: number) =>
  Math.round((Math.max(0, labor) * percent) / 100);

/** Every new job starts as "cash"; the customer may switch to online on the Payment screen. */
export async function createPaymentForJob(db: Db, jobId: string, now: Date): Promise<void> {
  await db.payment.create({ data: { jobId, method: 'CASH', status: 'CASH', createdAt: now } });
}

async function loadPayment(ctx: AppContext, jobId: string) {
  const payment = await ctx.prisma.payment.findUnique({
    where: { jobId },
    include: { holds: true, job: { include: { offer: true, priceChanges: true } } },
  });
  if (!payment) throw new AppError('NOT_FOUND', 404);
  return payment;
}

/** The job's price now: agreed price, or the last approved change, or the final price. */
function priceNow(job: {
  agreedPrice: number;
  finalPrice: number | null;
  priceChanges: { status: string; newPrice: number; answeredAt: Date | null }[];
}): number {
  if (job.finalPrice !== null) return job.finalPrice;
  const approved = job.priceChanges
    .filter((pc) => pc.status === 'APPROVED')
    .sort((a, b) => (a.answeredAt?.getTime() ?? 0) - (b.answeredAt?.getTime() ?? 0))
    .at(-1);
  return approved?.newPrice ?? job.agreedPrice;
}

/**
 * Customer picks how to pay (design/screens/Payment.html). Online: the provider holds
 * labor and parts separately. Cash can be chosen only while nothing is held.
 */
export async function choosePaymentMethod(
  ctx: AppContext,
  jobId: string,
  method: PaymentMethod,
): Promise<void> {
  const payment = await loadPayment(ctx, jobId);
  const job = payment.job;
  if (!ACTIVE_JOB.includes(job.status)) throw new AppError('JOB_NOT_ACTIVE', 409);
  if (payment.status !== 'CASH' && payment.status !== 'PENDING') {
    throw new AppError('PAYMENT_LOCKED', 409);
  }
  if (method === 'CASH') {
    await ctx.prisma.payment.updateMany({
      where: { id: payment.id, status: { in: ['CASH', 'PENDING'] } },
      data: { method: 'CASH', status: 'CASH', provider: null, providerRef: null },
    });
    return;
  }
  if (!ctx.env.ONLINE_PAYMENTS_ENABLED) throw new AppError('ONLINE_PAYMENTS_DISABLED', 409);

  const total = priceNow(job);
  const parts = Math.min(job.offer.partsPrice, total);
  const { providerRef, paid } = await ctx.payments.createHold({
    paymentId: payment.id,
    amount: total,
    method,
  });
  const now = ctx.now();
  await ctx.prisma.$transaction(async (tx) => {
    const { count } = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: ['CASH', 'PENDING'] } },
      data: {
        method,
        status: paid ? 'HELD' : 'PENDING',
        provider: ctx.payments.name,
        providerRef,
        heldAt: paid ? now : null,
      },
    });
    if (count === 0) throw new AppError('PAYMENT_LOCKED', 409);
    await tx.hold.createMany({
      data: [
        { paymentId: payment.id, kind: 'LABOR', amount: total - parts, createdAt: now },
        ...(parts > 0
          ? [{ paymentId: payment.id, kind: 'PARTS' as const, amount: parts, createdAt: now }]
          : []),
      ],
    });
  });
}

/** An approved price change: online, only the difference is charged (CLAUDE.md 7a). */
export async function onPriceApproved(ctx: AppContext, jobId: string, difference: number) {
  if (difference <= 0) return; // a lower price is settled at release (the rest is refunded)
  const payment = await ctx.prisma.payment.findUnique({ where: { jobId } });
  if (!payment || payment.status !== 'HELD' || payment.method === 'CASH') return;
  await ctx.payments.createHold({
    paymentId: payment.id,
    amount: difference,
    method: payment.method,
  });
  await ctx.prisma.hold.create({
    data: { paymentId: payment.id, kind: 'EXTRA', amount: difference, createdAt: ctx.now() },
  });
}

/**
 * Customer approved a parts receipt: online, the parts money goes to the master at once
 * (no commission on parts). Cash: nothing moves, it's just on record.
 */
export async function onReceiptApproved(ctx: AppContext, jobId: string, amount: number) {
  const payment = await ctx.prisma.payment.findUnique({
    where: { jobId },
    include: { holds: true, job: true },
  });
  if (!payment || payment.status !== 'HELD') return;
  const partsHold = payment.holds.find((h) => h.kind === 'PARTS' && h.status === 'HELD');
  if (!partsHold) return;
  const pay = Math.min(amount, partsHold.amount);
  const now = ctx.now();
  const { count } = await ctx.prisma.hold.updateMany({
    where: { id: partsHold.id, status: 'HELD' },
    data: { status: 'RELEASED', amount: pay, settledAt: now },
  });
  if (count === 0) return;
  if (partsHold.amount > pay) {
    // The receipt was cheaper than expected: the rest stays held with the labor.
    await ctx.prisma.hold.create({
      data: {
        paymentId: payment.id,
        kind: 'LABOR',
        amount: partsHold.amount - pay,
        createdAt: now,
      },
    });
  }
  const { providerRef } = await ctx.payments.payout({
    masterId: payment.job.masterId,
    jobId,
    amount: pay,
  });
  await ctx.prisma.payout.create({
    data: {
      masterId: payment.job.masterId,
      jobId,
      amount: pay,
      commission: 0,
      status: 'SENT',
      providerRef,
      createdAt: now,
      sentAt: now,
    },
  });
}

/**
 * The master finished. Cash: the commission goes to the master's balance.
 * Online: the customer has 24 h to confirm or complain, then the money is released.
 */
export async function onJobDone(ctx: AppContext, jobId: string, byCustomer: boolean) {
  const payment = await ctx.prisma.payment.findUnique({
    where: { jobId },
    include: { job: { include: { offer: true } } },
  });
  if (!payment) return;
  const job = payment.job;
  const now = ctx.now();

  if (payment.status === 'CASH') {
    const final = job.finalPrice ?? job.agreedPrice;
    const labor = final - Math.min(job.offer.partsPrice, final);
    const { percent } = await commissionRate(ctx, job.masterId, now);
    const commission = commissionOf(labor, percent);
    if (commission === 0) return;
    await ctx.prisma.$transaction(async (tx) => {
      await tx.balanceEntry.create({
        data: {
          masterId: job.masterId,
          jobId,
          kind: 'CASH_COMMISSION',
          amount: commission,
          createdAt: now,
        },
      });
      await tx.masterBalance.upsert({
        where: { masterId: job.masterId },
        create: { masterId: job.masterId, owed: commission },
        update: { owed: { increment: commission } },
      });
    });
    return;
  }

  if (payment.status === 'HELD') {
    // The customer tapped "done" themselves: that is the confirmation.
    if (byCustomer) {
      await releasePayment(ctx, jobId);
      return;
    }
    await ctx.prisma.payment.update({
      where: { id: payment.id },
      data: { releaseDueAt: new Date(now.getTime() + AUTO_RELEASE_HOURS * 60 * 60 * 1000) },
    });
  }
}

/**
 * Sends held money to the master (minus commission on labor) and returns the rest to the
 * customer. `masterShare` (admin split) overrides how much the master gets.
 * Safe to call twice: only HELD/FROZEN payments move.
 */
export async function releasePayment(ctx: AppContext, jobId: string, masterShare?: number) {
  const payment = await loadPayment(ctx, jobId);
  if (payment.status !== 'HELD' && payment.status !== 'FROZEN') return;
  const job = payment.job;
  const now = ctx.now();

  const held = payment.holds.filter((h) => h.status === 'HELD');
  const heldTotal = sum(held);
  const alreadyPaid = sum(payment.holds.filter((h) => h.status === 'RELEASED'));
  const due = Math.max(0, priceNow(job) - alreadyPaid);
  const toMaster = Math.min(heldTotal, masterShare ?? due);
  const toCustomer = heldTotal - toMaster;
  const partsHeld = sum(held.filter((h) => h.kind === 'PARTS'));
  const { percent } = await commissionRate(ctx, job.masterId, now);
  const commission = commissionOf(toMaster - partsHeld, percent);

  // Lock the payment first, so a second call (auto-release + tap) does nothing.
  const { count } = await ctx.prisma.payment.updateMany({
    where: { id: payment.id, status: { in: ['HELD', 'FROZEN'] } },
    data: {
      status: toMaster > 0 ? 'RELEASED' : 'REFUNDED',
      releasedAt: now,
      releaseDueAt: null,
    },
  });
  if (count === 0) return;
  await ctx.prisma.hold.updateMany({
    where: { paymentId: payment.id, status: 'HELD' },
    data: { status: toMaster > 0 ? 'RELEASED' : 'REFUNDED', settledAt: now },
  });

  if (toCustomer > 0 && payment.providerRef) {
    await ctx.payments.refund({ providerRef: payment.providerRef, amount: toCustomer });
  }
  if (toMaster > 0) {
    const amount = toMaster - commission;
    const { providerRef } = await ctx.payments.payout({ masterId: job.masterId, jobId, amount });
    await ctx.prisma.payout.create({
      data: {
        masterId: job.masterId,
        jobId,
        amount,
        commission,
        status: 'SENT',
        providerRef,
        createdAt: now,
        sentAt: now,
      },
    });
  }
}

/** A problem was reported while money is held: freeze it until an admin decides. */
export async function freezePayment(ctx: AppContext, jobId: string, complaintId: string) {
  const { count } = await ctx.prisma.payment.updateMany({
    where: { jobId, status: 'HELD' },
    data: { status: 'FROZEN', releaseDueAt: null },
  });
  if (count === 0) return false;
  await ctx.prisma.dispute.upsert({
    where: { jobId },
    create: { jobId, complaintId, createdAt: ctx.now() },
    update: { status: 'OPEN', complaintId, decidedAt: null, masterAmount: null, adminNote: null },
  });
  return true;
}

/** The job was cancelled: give back everything that is held. */
export async function onJobCancelled(ctx: AppContext, jobId: string) {
  const payment = await ctx.prisma.payment.findUnique({
    where: { jobId },
    include: { holds: true },
  });
  if (!payment) return;
  if (payment.status === 'CASH' || payment.status === 'PENDING') {
    await ctx.prisma.payment.update({ where: { id: payment.id }, data: { status: 'CANCELLED' } });
    return;
  }
  if (payment.status === 'HELD') await releasePayment(ctx, jobId, 0);
}

/**
 * Runs every few minutes (and lazily on reads): reminds customers before the automatic
 * release and releases payments whose 24 h are over.
 */
export async function sweepPayments(ctx: AppContext, onlyJobId?: string): Promise<void> {
  const now = ctx.now();
  const due = await ctx.prisma.payment.findMany({
    where: {
      status: 'HELD',
      releaseDueAt: { lte: now },
      ...(onlyJobId ? { jobId: onlyJobId } : {}),
    },
    select: { jobId: true },
  });
  for (const p of due) await releasePayment(ctx, p.jobId);

  const soon = await ctx.prisma.payment.findMany({
    where: {
      status: 'HELD',
      reminderSentAt: null,
      releaseDueAt: { gt: now, lte: new Date(now.getTime() + REMINDER_BEFORE_MS) },
      ...(onlyJobId ? { jobId: onlyJobId } : {}),
    },
    include: { job: true },
  });
  for (const p of soon) {
    const { count } = await ctx.prisma.payment.updateMany({
      where: { id: p.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (count === 0) continue;
    notifyInBackground(
      ctx,
      notifyUsers(ctx, [p.job.customerId], 'paymentReminder', () => ({}), {
        type: 'job',
        jobId: p.jobId,
      }),
    );
  }
}
