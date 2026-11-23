import { describe, expect, it } from 'vitest';
import { jobDtoSchema, masterPublicDtoSchema } from '@usta/shared';
import { createJob } from '../../test/fixtures';
import { bearer, login, useTestApp } from '../../test/helpers';

describe('trust', () => {
  const t = useTestApp();

  const review = (jobId: string, headers: Record<string, string>, payload: object) =>
    t.app.inject({ method: 'POST', url: `/jobs/${jobId}/review`, headers, payload });

  describe('reviews', () => {
    it('the customer reviews a finished job and the master rating updates', async () => {
      const s = await createJob(t);
      const res = await review(s.jobId, s.customerAuth, { stars: 4, comment: 'Yaxshi ishladi' });

      expect(res.statusCode).toBe(201);
      const job = jobDtoSchema.parse(res.json());
      expect(job.review).toMatchObject({ stars: 4, comment: 'Yaxshi ishladi' });
      expect(job.canReview).toBe(false);

      const profile = await t.ctx.prisma.masterProfile.findUniqueOrThrow({
        where: { userId: s.master.userId },
      });
      expect(profile).toMatchObject({ ratingAvg: 4, ratingCount: 1 });
    });

    it('only once per job', async () => {
      const s = await createJob(t);
      await review(s.jobId, s.customerAuth, { stars: 5 });
      const again = await review(s.jobId, s.customerAuth, { stars: 1 });
      expect(again.json()).toEqual({ error: { code: 'REVIEW_ALREADY_EXISTS' } });
    });

    it('only for DONE jobs', async () => {
      const s = await createJob(t, { finish: false });
      const res = await review(s.jobId, s.customerAuth, { stars: 5 });
      expect(res.json()).toEqual({ error: { code: 'JOB_NOT_DONE' } });
    });

    it('only by the customer of the job', async () => {
      const s = await createJob(t);
      const byMaster = await review(s.jobId, s.master.auth, { stars: 5 });
      const stranger = await login(t, '+998909998877', 'CUSTOMER');
      const byStranger = await review(s.jobId, bearer(stranger.accessToken), { stars: 5 });
      expect(byMaster.statusCode).toBe(403);
      expect(byStranger.statusCode).toBe(404);
    });

    it('validates the stars', async () => {
      const s = await createJob(t);
      expect((await review(s.jobId, s.customerAuth, { stars: 6 })).statusCode).toBe(400);
      expect((await review(s.jobId, s.customerAuth, { stars: 0 })).statusCode).toBe(400);
    });

    it('the master page shows all reviews, negative ones too', async () => {
      const s = await createJob(t);
      await review(s.jobId, s.customerAuth, { stars: 1, comment: 'Kechikdi' });
      const res = await t.app.inject({ method: 'GET', url: `/masters/${s.master.userId}` });

      const page = masterPublicDtoSchema.parse(res.json());
      expect(page.master).toMatchObject({ name: 'Akmal Karimov', ratingAvg: 1, ratingCount: 1 });
      expect(page.reviews[0]).toMatchObject({ stars: 1, comment: 'Kechikdi' });
      // Where the master works and the typical prices of their trades.
      expect(page.districts.length).toBeGreaterThan(0);
      expect(page.prices.length).toBeLessThanOrEqual(5);
    });

    it('hides unverified masters', async () => {
      const s = await createJob(t);
      await t.ctx.prisma.masterProfile.update({
        where: { userId: s.master.userId },
        data: { verificationStatus: 'PENDING' },
      });
      const res = await t.app.inject({ method: 'GET', url: `/masters/${s.master.userId}` });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('guarantee', () => {
    const claim = (jobId: string, headers: Record<string, string>, description = 'Yana oqyapti') =>
      t.app.inject({
        method: 'POST',
        url: `/jobs/${jobId}/guarantee-claims`,
        headers,
        payload: { description },
      });

    it('opens a claim within 14 days and notifies the master', async () => {
      const s = await createJob(t);
      await t.app.inject({
        method: 'POST',
        url: '/push-tokens',
        headers: s.master.auth,
        payload: { token: 'ExponentPushToken[master]', platform: 'android' },
      });
      t.clock.advance(10 * 86_400_000);
      // The 15-minute access token expired during those 10 days.
      const again = await login(t, '+998901112233');
      const res = await claim(s.jobId, bearer(again.accessToken));
      await t.ctx.background.drain();

      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ canClaimGuarantee: false });
      expect(res.json().guaranteeClaims[0]).toMatchObject({ status: 'OPEN' });
      expect(t.push.sent.at(-1)).toMatchObject({ title: 'Kafolat: muammo qaytdi' });
    });

    it('refuses after the guarantee ended', async () => {
      const s = await createJob(t);
      t.clock.advance(15 * 86_400_000);
      const again = await login(t, '+998901112233');
      const res = await claim(s.jobId, bearer(again.accessToken));
      expect(res.json()).toEqual({ error: { code: 'GUARANTEE_EXPIRED' } });
    });

    it('one open claim at a time', async () => {
      const s = await createJob(t);
      await claim(s.jobId, s.customerAuth);
      const second = await claim(s.jobId, s.customerAuth);
      expect(second.json()).toEqual({ error: { code: 'CLAIM_ALREADY_OPEN' } });
    });

    it('needs a description and a finished job', async () => {
      const done = await createJob(t);
      expect((await claim(done.jobId, done.customerAuth, 'x')).statusCode).toBe(400);
    });
  });

  describe('complaints', () => {
    const complain = (
      jobId: string,
      headers: Record<string, string>,
      text = "Usta qo'pol gapirdi",
    ) =>
      t.app.inject({
        method: 'POST',
        url: `/jobs/${jobId}/complaints`,
        headers,
        payload: { text },
      });

    it('both sides can complain and see their own complaints', async () => {
      const s = await createJob(t, { finish: false });
      const fromCustomer = await complain(s.jobId, s.customerAuth);
      const fromMaster = await complain(s.jobId, s.master.auth, 'Mijoz eshikni ochmadi');

      expect(fromCustomer.statusCode).toBe(201);
      expect(fromMaster.json()).toMatchObject({ status: 'OPEN' });
      const mine = await t.app.inject({
        method: 'GET',
        url: `/jobs/${s.jobId}/complaints`,
        headers: s.customerAuth,
      });
      expect(mine.json()).toHaveLength(1);
    });

    it('limits open complaints per job', async () => {
      const s = await createJob(t);
      for (let i = 0; i < 3; i++) await complain(s.jobId, s.customerAuth);
      const fourth = await complain(s.jobId, s.customerAuth);
      expect(fourth.statusCode).toBe(409);
    });

    it('strangers cannot complain', async () => {
      const s = await createJob(t);
      const stranger = await login(t, '+998909998877', 'CUSTOMER');
      const res = await complain(s.jobId, bearer(stranger.accessToken));
      expect(res.statusCode).toBe(404);
    });

    it('validates the text', async () => {
      const s = await createJob(t);
      expect((await complain(s.jobId, s.customerAuth, 'abc')).statusCode).toBe(400);
    });
  });
});
