import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  bonusAllowed,
  choosePaymentSchema,
  createPartsReceiptSchema,
  resolveDisputeSchema,
  settleBalanceSchema,
  type MasterBalanceDto,
  type PaymentDto,
} from '@usta/shared';
import { requireAdmin } from '../admin/auth';
import { requireUser } from '../auth/authenticate';
import { bonusBalance } from '../growth/service';
import type { AppContext } from '../context';
import type { User } from '../generated/prisma/client';
import { AppError, notFound } from '../lib/errors';
import { publicStorageEndpoint } from '../storage/public-endpoint';
import { assertUpload } from '../storage/uploads';
import {
  choosePaymentMethod,
  commissionOf,
  commissionRate,
  onReceiptApproved,
  releasePayment,
  sweepPayments,
} from './service';

const idParams = z.object({ id: z.string().min(1) });
const receiptParams = z.object({ id: z.string().min(1), receiptId: z.string().min(1) });

export function registerPaymentRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { prisma, storage } = ctx;
  const endpoint = (request: FastifyRequest) => publicStorageEndpoint(ctx.env, request);

  async function loadJob(id: string, user: User) {
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        offer: true,
        priceChanges: true,
        payment: { include: { holds: true } },
        partsReceipts: { orderBy: { createdAt: 'asc' } },
        dispute: true,
      },
    });
    if (!job || (job.customerId !== user.id && job.masterId !== user.id)) throw notFound();
    return job;
  }

  async function toPaymentDto(
    jobId: string,
    user: User,
    request: FastifyRequest,
  ): Promise<PaymentDto> {
    await sweepPayments(ctx, jobId);
    const job = await loadJob(jobId, user);
    const payment = job.payment;
    if (!payment) throw notFound();
    const approved = job.priceChanges
      .filter((pc) => pc.status === 'APPROVED')
      .sort((a, b) => (a.answeredAt?.getTime() ?? 0) - (b.answeredAt?.getTime() ?? 0))
      .at(-1);
    const total = job.finalPrice ?? approved?.newPrice ?? job.agreedPrice;
    const partsEstimate = Math.min(job.offer.partsPrice, total);
    const labor = total - partsEstimate;
    const { percent } = await commissionRate(ctx, job.masterId, job.doneAt ?? ctx.now());
    const commission = commissionOf(labor, percent);
    const isCustomer = job.customerId === user.id;
    const bonusNow = isCustomer ? await bonusBalance(prisma, user.id) : 0;
    const promo = payment.promoCodeId
      ? await prisma.promoCode.findUnique({ where: { id: payment.promoCodeId } })
      : null;
    const customerPays = total - payment.promoDiscount - payment.bonusUsed;
    const held = payment.holds.filter((h) => h.status === 'HELD').reduce((s, h) => s + h.amount, 0);
    const ep = endpoint(request);
    return {
      method: payment.method,
      status: payment.status,
      onlineAvailable: ctx.env.ONLINE_PAYMENTS_ENABLED,
      total,
      promoCode: promo?.code ?? null,
      promoDiscount: payment.promoDiscount,
      bonusUsed: payment.bonusUsed,
      customerPays,
      bonusBalance: bonusNow,
      bonusAllowed:
        payment.promoDiscount + payment.bonusUsed > 0 ? 0 : bonusAllowed(total, bonusNow),
      labor,
      partsEstimate,
      held,
      commission,
      commissionPercent: percent,
      masterGets: total - commission,
      releaseDueAt: payment.releaseDueAt?.toISOString() ?? null,
      canConfirm: job.customerId === user.id && job.status === 'DONE' && payment.status === 'HELD',
      disputeOpen: job.dispute?.status === 'OPEN',
      receipts: await Promise.all(
        job.partsReceipts.map(async (r) => ({
          id: r.id,
          photoUrl: await storage.presignDownload(r.photoKey, ep),
          description: r.description,
          amount: r.amount,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        })),
      ),
    };
  }

  // ---------- Customer and master ----------

  app.get('/jobs/:id/payment', async (request): Promise<PaymentDto> => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    return toPaymentDto(id, user, request);
  });

  /** Customer picks cash, Click or Payme (design/screens/Payment.html). */
  app.post('/jobs/:id/payment', async (request): Promise<PaymentDto> => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    const { method, promoCode, useBonus } = choosePaymentSchema.parse(request.body);
    const job = await loadJob(id, user);
    if (job.customerId !== user.id) throw new AppError('FORBIDDEN', 403);
    await choosePaymentMethod(ctx, id, method, { promoCode, useBonus });
    return toPaymentDto(id, user, request);
  });

  /** Customer: "Yes, the job is done, send the money" (design/screens/ConfirmJob.html). */
  app.post('/jobs/:id/confirm', async (request): Promise<PaymentDto> => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    const job = await loadJob(id, user);
    if (job.customerId !== user.id) throw new AppError('FORBIDDEN', 403);
    if (job.status !== 'DONE' || job.payment?.status !== 'HELD') {
      throw new AppError('NOTHING_TO_CONFIRM', 409);
    }
    await releasePayment(ctx, id);
    return toPaymentDto(id, user, request);
  });

  /** Master: receipt photo for bought parts (design/screens/MasterPayout.html). */
  app.post('/jobs/:id/parts-receipts', async (request, reply) => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    const body = createPartsReceiptSchema.parse(request.body);
    const job = await loadJob(id, user);
    if (job.masterId !== user.id) throw new AppError('FORBIDDEN', 403);
    if (job.status === 'CANCELLED') throw new AppError('JOB_NOT_ACTIVE', 409);
    await assertUpload(storage, user.id, 'parts-receipt', body.photoKey);
    await prisma.partsReceipt.create({
      data: {
        jobId: id,
        photoKey: body.photoKey,
        description: body.description,
        amount: body.amount,
        createdAt: ctx.now(),
      },
    });
    return reply.code(201).send(await toPaymentDto(id, user, request));
  });

  async function answerReceipt(request: FastifyRequest, approve: boolean): Promise<PaymentDto> {
    const user = await requireUser(ctx, request);
    const { id, receiptId } = receiptParams.parse(request.params);
    const job = await loadJob(id, user);
    if (job.customerId !== user.id) throw new AppError('FORBIDDEN', 403);
    const receipt = job.partsReceipts.find((r) => r.id === receiptId);
    if (!receipt) throw notFound();
    const { count } = await prisma.partsReceipt.updateMany({
      where: { id: receiptId, status: 'PENDING' },
      data: { status: approve ? 'APPROVED' : 'REJECTED', answeredAt: ctx.now() },
    });
    if (count === 0) throw new AppError('RECEIPT_NOT_PENDING', 409);
    if (approve) await onReceiptApproved(ctx, id, receipt.amount);
    return toPaymentDto(id, user, request);
  }
  app.post('/jobs/:id/parts-receipts/:receiptId/approve', (r) => answerReceipt(r, true));
  app.post('/jobs/:id/parts-receipts/:receiptId/reject', (r) => answerReceipt(r, false));

  /** Master: commission owed from cash jobs. */
  app.get('/master/balance', async (request): Promise<MasterBalanceDto> => {
    const user = await requireUser(ctx, request);
    if (user.role !== 'MASTER') throw new AppError('FORBIDDEN', 403);
    const [balance, entries, rate] = await Promise.all([
      prisma.masterBalance.findUnique({ where: { masterId: user.id } }),
      prisma.balanceEntry.findMany({
        where: { masterId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      commissionRate(ctx, user.id, ctx.now()),
    ]);
    return {
      owed: balance?.owed ?? 0,
      commissionPercent: ctx.env.COMMISSION_PERCENT,
      freeUntil: rate.freeUntil && rate.freeUntil > ctx.now() ? rate.freeUntil.toISOString() : null,
      entries: entries.map((e) => ({
        id: e.id,
        kind: e.kind,
        amount: e.amount,
        jobId: e.jobId,
        note: e.note,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  });

  // ---------- Admin ----------

  app.get('/admin/disputes', async (request) => {
    await requireAdmin(ctx, request);
    const disputes = await prisma.dispute.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
      include: {
        job: {
          include: {
            customer: { select: { name: true, phone: true } },
            master: { select: { name: true, phone: true } },
            request: { include: { category: true } },
            payment: { include: { holds: true } },
          },
        },
      },
    });
    return disputes.map((d) => ({
      id: d.id,
      jobId: d.jobId,
      status: d.status,
      category: d.job.request.category.nameUzLatn,
      customer: `${d.job.customer.name ?? ''} ${d.job.customer.phone}`.trim(),
      master: `${d.job.master.name ?? ''} ${d.job.master.phone}`.trim(),
      held: (d.job.payment?.holds ?? [])
        .filter((h) => h.status === 'HELD')
        .reduce((s, h) => s + h.amount, 0),
      price: d.job.finalPrice ?? d.job.agreedPrice,
      masterAmount: d.masterAmount,
      adminNote: d.adminNote,
      createdAt: d.createdAt.toISOString(),
      decidedAt: d.decidedAt?.toISOString() ?? null,
    }));
  });

  /** Admin decision: to the master, back to the customer, or split. */
  app.post('/admin/disputes/:id/resolve', async (request) => {
    await requireAdmin(ctx, request);
    const { id } = idParams.parse(request.params);
    const body = resolveDisputeSchema.parse(request.body);
    const dispute = await prisma.dispute.findUnique({ where: { id } });
    if (!dispute) throw notFound();
    const { count } = await prisma.dispute.updateMany({
      where: { id, status: 'OPEN' },
      data: {
        status: body.decision,
        masterAmount: body.decision === 'SPLIT' ? body.masterAmount : null,
        adminNote: body.note,
        decidedAt: ctx.now(),
      },
    });
    if (count === 0) throw new AppError('CONFLICT', 409);
    const share =
      body.decision === 'RELEASED'
        ? undefined
        : body.decision === 'REFUNDED'
          ? 0
          : body.masterAmount;
    await releasePayment(ctx, dispute.jobId, share);
    return { ok: true };
  });

  app.get('/admin/balances', async (request) => {
    await requireAdmin(ctx, request);
    const balances = await prisma.masterBalance.findMany({
      where: { owed: { gt: 0 } },
      orderBy: { owed: 'desc' },
      include: { master: { select: { name: true, phone: true } } },
    });
    return balances.map((b) => ({
      masterId: b.masterId,
      name: b.master.name,
      phone: b.master.phone,
      owed: b.owed,
      updatedAt: b.updatedAt.toISOString(),
    }));
  });

  /** The master paid their commission debt (cash, bank transfer): record it. */
  app.post('/admin/balances/:id/settle', async (request) => {
    await requireAdmin(ctx, request);
    const { id } = idParams.parse(request.params);
    const body = settleBalanceSchema.parse(request.body);
    const balance = await prisma.masterBalance.findUnique({ where: { masterId: id } });
    if (!balance) throw notFound();
    const amount = Math.min(body.amount, balance.owed);
    await prisma.$transaction([
      prisma.balanceEntry.create({
        data: {
          masterId: id,
          kind: 'SETTLEMENT',
          amount: -amount,
          note: body.note ?? null,
          createdAt: ctx.now(),
        },
      }),
      prisma.masterBalance.update({
        where: { masterId: id },
        data: { owed: { decrement: amount } },
      }),
    ]);
    return { ok: true, owed: balance.owed - amount };
  });
}
