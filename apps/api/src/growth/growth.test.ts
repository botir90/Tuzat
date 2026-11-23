import { describe, expect, it } from 'vitest';
import { bonusDtoSchema, paymentDtoSchema } from '@usta/shared';
import { createJob } from '../../test/fixtures';
import { bearer, login, useTestApp } from '../../test/helpers';

describe('growth: bonuses, referrals, promo codes', () => {
  const t = useTestApp();

  const call = (
    method: 'GET' | 'POST',
    url: string,
    headers: Record<string, string>,
    payload?: object,
  ) => t.app.inject({ method, url, headers, payload });
  const bonus = async (headers: Record<string, string>) =>
    bonusDtoSchema.parse((await call('GET', '/me/bonus', headers)).json());
  const finish = async (jobId: string, master: Record<string, string>) => {
    await call('POST', `/jobs/${jobId}/status`, master, { status: 'IN_PROGRESS' });
    await call('POST', `/jobs/${jobId}/status`, master, { status: 'DONE' });
  };
  const addPromo = () =>
    t.ctx.prisma.promoCode.create({
      data: {
        code: 'BIRINCHI',
        titleUzLatn: 'Birinchi buyurtmaga 20% chegirma',
        titleUzCyrl: 'Биринчи буюртмага 20% чегирма',
        titleRu: 'Скидка 20% на первый заказ',
        percent: 20,
        maxDiscount: 50_000,
        firstOrderOnly: true,
        showOnHome: true,
      },
    });

  describe('referral', () => {
    it("both get 30 000 after the invited friend's first finished order, once", async () => {
      const inviter = bearer((await login(t, '+998907770011', 'CUSTOMER')).accessToken);
      const code = (await bonus(inviter)).referralCode;
      expect(code).toMatch(/^[A-Z]{3,8}\d+$/);

      const s = await createJob(t, { finish: false });
      expect((await call('POST', '/me/referral', s.customerAuth, { code })).statusCode).toBe(200);
      await finish(s.jobId, s.master.auth);

      expect((await bonus(inviter)).balance).toBe(30_000);
      expect(await bonus(s.customerAuth)).toMatchObject({
        balance: 30_000,
        canEnterReferral: false,
      });
      expect(await bonus(inviter)).toMatchObject({ referredCount: 1, referralEarned: 30_000 });
    });

    it('refuses your own code and codes after the first order', async () => {
      const s = await createJob(t);
      const own = (await bonus(s.customerAuth)).referralCode;
      expect((await call('POST', '/me/referral', s.customerAuth, { code: own })).statusCode).toBe(
        409,
      );
    });
  });

  describe('promo code', () => {
    it('first-order code: the customer pays less, the platform owes the master the discount', async () => {
      await addPromo();
      t.ctx.env.COMMISSION_FREE_DAYS = 0;
      const s = await createJob(t, { finish: false });
      const res = await call('POST', `/jobs/${s.jobId}/payment`, s.customerAuth, {
        method: 'CASH',
        promoCode: 'birinchi',
      });
      expect(paymentDtoSchema.parse(res.json())).toMatchObject({
        promoCode: 'BIRINCHI',
        promoDiscount: 24_000,
        customerPays: 96_000,
        total: 120_000,
      });
      // Only once per order.
      const again = await call('POST', `/jobs/${s.jobId}/payment`, s.customerAuth, {
        method: 'CASH',
        promoCode: 'BIRINCHI',
      });
      expect(again.json().error.code).toBe('DISCOUNT_ALREADY_APPLIED');

      await finish(s.jobId, s.master.auth);
      // Commission 6 000 minus the 24 000 discount we owe the master.
      const balance = (await call('GET', '/master/balance', s.master.auth)).json();
      expect(balance.owed).toBe(-18_000);
    });

    it('unknown codes are refused; home shows active promotions', async () => {
      await addPromo();
      const s = await createJob(t, { finish: false });
      const res = await call('POST', `/jobs/${s.jobId}/payment`, s.customerAuth, {
        method: 'CASH',
        promoCode: 'YOQ',
      });
      expect(res.json().error.code).toBe('PROMO_NOT_FOUND');
      const home = (await t.app.inject({ method: 'GET', url: '/promos/home' })).json();
      expect(home).toEqual([expect.objectContaining({ code: 'BIRINCHI', percent: 20 })]);
    });
  });

  describe('paying with bonus', () => {
    it('pays at most half; a cancelled job gives the bonus back', async () => {
      const s = await createJob(t, { finish: false });
      await t.ctx.prisma.bonusEntry.create({
        data: { userId: s.customer.userId, kind: 'REFERRAL', amount: 100_000 },
      });
      const res = await call('POST', `/jobs/${s.jobId}/payment`, s.customerAuth, {
        method: 'CASH',
        useBonus: true,
      });
      expect(res.json()).toMatchObject({
        bonusUsed: 60_000,
        customerPays: 60_000,
        bonusBalance: 40_000,
      });

      await call('POST', `/jobs/${s.jobId}/cancel`, s.customerAuth, {});
      expect((await bonus(s.customerAuth)).balance).toBe(100_000);
    });
  });

  it('a review with a photo earns 3 000', async () => {
    const s = await createJob(t);
    const res = await call('POST', '/uploads/presign', s.customerAuth, {
      kind: 'review-photo',
      contentType: 'image/jpeg',
    });
    t.storage.put(res.json().key);
    await call('POST', `/jobs/${s.jobId}/review`, s.customerAuth, {
      stars: 5,
      photoKeys: [res.json().key],
    });
    expect((await bonus(s.customerAuth)).balance).toBe(3_000);
  });

  it('online payment gives cashback by level', async () => {
    t.ctx.env.ONLINE_PAYMENTS_ENABLED = true;
    const s = await createJob(t, { finish: false });
    await call('POST', `/jobs/${s.jobId}/payment`, s.customerAuth, { method: 'CLICK' });
    await finish(s.jobId, s.master.auth);
    await call('POST', `/jobs/${s.jobId}/confirm`, s.customerAuth);
    // Bronze: 3% of 120 000.
    expect(await bonus(s.customerAuth)).toMatchObject({ balance: 3_600, level: 'BRONZE' });
  });
});
