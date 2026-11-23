import { describe, expect, it } from 'vitest';
import { masterBalanceDtoSchema, paymentDtoSchema, type PaymentDto } from '@usta/shared';
import { createJob } from '../../test/fixtures';
import { bearer, login, useTestApp } from '../../test/helpers';
import { hashPassword } from '../admin/password';
import type { FakePaymentProvider } from './provider';

describe('payments', () => {
  const t = useTestApp();
  const provider = () => t.ctx.payments as FakePaymentProvider;

  const call = async (
    method: 'GET' | 'POST',
    url: string,
    headers: Record<string, string>,
    payload?: object,
  ) => t.app.inject({ method, url, headers, payload });
  const payment = async (jobId: string, headers: Record<string, string>): Promise<PaymentDto> =>
    paymentDtoSchema.parse((await call('GET', `/jobs/${jobId}/payment`, headers)).json());
  const setStatus = (jobId: string, headers: Record<string, string>, status: string) =>
    call('POST', `/jobs/${jobId}/status`, headers, { status });
  /** Commission from day one (the free months would hide it). */
  const chargeCommission = () => {
    t.ctx.env.COMMISSION_FREE_DAYS = 0;
  };
  const enableOnline = () => {
    t.ctx.env.ONLINE_PAYMENTS_ENABLED = true;
  };
  /** After the clock moves a day, the old 15-minute access tokens have expired. */
  const freshMaster = async () => bearer((await login(t, '+998905556677', 'MASTER')).accessToken);
  const freshCustomer = async () =>
    bearer((await login(t, '+998901112233', 'CUSTOMER')).accessToken);
  async function adminAuth() {
    await t.ctx.prisma.adminUser.create({
      data: { username: 'botir', passwordHash: await hashPassword('admin-password-123') },
    });
    const res = await call(
      'POST',
      '/admin/auth/login',
      {},
      {
        username: 'botir',
        password: 'admin-password-123',
      },
    );
    return bearer(res.json().token);
  }

  describe('cash', () => {
    it('a new job is cash; when done, the commission goes to the master balance', async () => {
      chargeCommission();
      const s = await createJob(t);
      expect(await payment(s.jobId, s.customerAuth)).toMatchObject({
        method: 'CASH',
        status: 'CASH',
        total: 120_000,
        commission: 6_000,
        masterGets: 114_000,
      });
      const balance = masterBalanceDtoSchema.parse(
        (await call('GET', '/master/balance', s.master.auth)).json(),
      );
      expect(balance.owed).toBe(6_000);
      expect(balance.entries[0]).toMatchObject({
        kind: 'CASH_COMMISSION',
        amount: 6_000,
        jobId: s.jobId,
      });
    });

    it('new masters pay no commission in their first months', async () => {
      const s = await createJob(t);
      const balance = masterBalanceDtoSchema.parse(
        (await call('GET', '/master/balance', s.master.auth)).json(),
      );
      expect(balance.owed).toBe(0);
      expect(balance.freeUntil).not.toBeNull();
    });

    it('admin records that the master paid the debt', async () => {
      chargeCommission();
      const s = await createJob(t);
      const admin = await adminAuth();
      expect((await call('GET', '/admin/balances', admin)).json()[0]).toMatchObject({
        owed: 6_000,
      });
      const res = await call('POST', `/admin/balances/${s.master.userId}/settle`, admin, {
        amount: 6_000,
      });
      expect(res.json()).toMatchObject({ owed: 0 });
    });
  });

  describe('online (escrow, fake provider)', () => {
    it('is off until the feature flag is on', async () => {
      const s = await createJob(t, { finish: false });
      const res = await call('POST', `/jobs/${s.jobId}/payment`, s.customerAuth, {
        method: 'CLICK',
      });
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('ONLINE_PAYMENTS_DISABLED');
    });

    it('held → master done → customer confirms → master paid minus commission', async () => {
      enableOnline();
      chargeCommission();
      const s = await createJob(t, { finish: false });
      const chosen = await call('POST', `/jobs/${s.jobId}/payment`, s.customerAuth, {
        method: 'CLICK',
      });
      expect(chosen.json()).toMatchObject({ method: 'CLICK', status: 'HELD', held: 120_000 });
      // Cash can't be chosen any more: the money is held.
      expect(
        (await call('POST', `/jobs/${s.jobId}/payment`, s.customerAuth, { method: 'CASH' }))
          .statusCode,
      ).toBe(409);

      await setStatus(s.jobId, s.master.auth, 'IN_PROGRESS');
      await setStatus(s.jobId, s.master.auth, 'DONE');
      const waiting = await payment(s.jobId, s.customerAuth);
      expect(waiting).toMatchObject({ status: 'HELD', canConfirm: true });
      expect(waiting.releaseDueAt).not.toBeNull();

      const confirmed = await call('POST', `/jobs/${s.jobId}/confirm`, s.customerAuth);
      expect(confirmed.json()).toMatchObject({ status: 'RELEASED', held: 0, canConfirm: false });
      expect(provider().payouts).toEqual([
        { masterId: s.master.userId, jobId: s.jobId, amount: 114_000 },
      ]);
      // Twice does nothing.
      expect((await call('POST', `/jobs/${s.jobId}/confirm`, s.customerAuth)).statusCode).toBe(409);
      expect(provider().payouts).toHaveLength(1);
    });

    it('releases automatically 24 h after the master finished, with a reminder first', async () => {
      enableOnline();
      const s = await createJob(t, { finish: false });
      await t.app.inject({
        method: 'POST',
        url: '/push-tokens',
        headers: s.customerAuth,
        payload: { token: 'ExponentPushToken[customer]', platform: 'android' },
      });
      await call('POST', `/jobs/${s.jobId}/payment`, s.customerAuth, { method: 'PAYME' });
      await setStatus(s.jobId, s.master.auth, 'IN_PROGRESS');
      await setStatus(s.jobId, s.master.auth, 'DONE');

      t.clock.advance(21 * 3600 * 1000);
      expect((await payment(s.jobId, await freshMaster())).status).toBe('HELD');
      await t.ctx.background.drain();
      expect(t.push.sent.some((p) => p.title === 'Ish yaxshi bajarildimi?')).toBe(true);

      t.clock.advance(4 * 3600 * 1000);
      expect((await payment(s.jobId, await freshMaster())).status).toBe('RELEASED');
      expect(provider().payouts).toHaveLength(1);
    });

    it('an approved price change holds only the difference', async () => {
      enableOnline();
      const s = await createJob(t, { finish: false });
      await call('POST', `/jobs/${s.jobId}/payment`, s.customerAuth, { method: 'CLICK' });
      const pc = (
        await call('POST', `/jobs/${s.jobId}/price-changes`, s.master.auth, {
          newPrice: 150_000,
          reason: 'Ichki qism almashtirildi',
        })
      ).json().pendingPriceChange;
      await call('POST', `/jobs/${s.jobId}/price-changes/${pc.id}/approve`, s.customerAuth);
      expect(provider().holds.map((h) => h.amount)).toEqual([120_000, 30_000]);
      expect((await payment(s.jobId, s.customerAuth)).held).toBe(150_000);
    });

    it('an approved parts receipt pays the parts at once, without commission', async () => {
      enableOnline();
      chargeCommission();
      const s = await createJob(t, { finish: false });
      // The master's offer said 40 000 of the price is parts.
      await t.ctx.prisma.offer.updateMany({ data: { partsPrice: 40_000 } });
      await call('POST', `/jobs/${s.jobId}/payment`, s.customerAuth, { method: 'CLICK' });
      const added = await call('POST', `/jobs/${s.jobId}/parts-receipts`, s.master.auth, {
        photoKey: await uploadedKey(s.master.auth),
        description: 'Kran aralashtirgich',
        amount: 38_000,
      });
      expect(added.statusCode).toBe(201);
      const receiptId = added.json().receipts[0].id;
      const approved = await call(
        'POST',
        `/jobs/${s.jobId}/parts-receipts/${receiptId}/approve`,
        s.customerAuth,
      );
      expect(approved.json().receipts[0].status).toBe('APPROVED');
      expect(provider().payouts).toEqual([
        { masterId: s.master.userId, jobId: s.jobId, amount: 38_000 },
      ]);
      // 2 000 of unused parts money stays held with the labor (80 000).
      expect(approved.json().held).toBe(82_000);
    });

    it('a customer complaint freezes the money; the admin splits it', async () => {
      enableOnline();
      chargeCommission();
      const s = await createJob(t, { finish: false });
      await call('POST', `/jobs/${s.jobId}/payment`, s.customerAuth, { method: 'CLICK' });
      await setStatus(s.jobId, s.master.auth, 'IN_PROGRESS');
      await setStatus(s.jobId, s.master.auth, 'DONE');
      await call('POST', `/jobs/${s.jobId}/complaints`, s.customerAuth, { reason: 'NOT_FIXED' });

      const frozen = await payment(s.jobId, s.customerAuth);
      expect(frozen).toMatchObject({ status: 'FROZEN', disputeOpen: true, releaseDueAt: null });
      // 24 h pass: frozen money does not move.
      t.clock.advance(30 * 3600 * 1000);
      const admin = await adminAuth();
      expect((await payment(s.jobId, await freshCustomer())).status).toBe('FROZEN');

      const dispute = (await call('GET', '/admin/disputes', admin)).json()[0];
      expect(dispute).toMatchObject({ status: 'OPEN', held: 120_000 });
      await call('POST', `/admin/disputes/${dispute.id}/resolve`, admin, {
        decision: 'SPLIT',
        masterAmount: 60_000,
        note: 'Yarim ish bajarilgan',
      });
      expect(provider().payouts).toEqual([
        { masterId: s.master.userId, jobId: s.jobId, amount: 57_000 },
      ]);
      expect(provider().refunds.map((r) => r.amount)).toEqual([60_000]);
    });

    it('cancelling a job gives the held money back', async () => {
      enableOnline();
      const s = await createJob(t, { finish: false });
      await call('POST', `/jobs/${s.jobId}/payment`, s.customerAuth, { method: 'CLICK' });
      await call('POST', `/jobs/${s.jobId}/cancel`, s.customerAuth, {});
      expect((await payment(s.jobId, s.customerAuth)).status).toBe('REFUNDED');
      expect(provider().refunds.map((r) => r.amount)).toEqual([120_000]);
      expect(provider().payouts).toEqual([]);
    });
  });

  /** Puts a receipt photo into storage the way the app does (pre-signed upload). */
  async function uploadedKey(headers: Record<string, string>): Promise<string> {
    const res = await call('POST', '/uploads/presign', headers, {
      kind: 'parts-receipt',
      contentType: 'image/jpeg',
    });
    const key: string = res.json().key;
    t.storage.put(key);
    return key;
  }
});
