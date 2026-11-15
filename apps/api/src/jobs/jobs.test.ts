import { describe, expect, it } from 'vitest';
import { customerOfferDtoSchema, jobDtoSchema } from '@usta/shared';
import { createCatalog, createMaster } from '../../test/fixtures';
import { bearer, login, useTestApp } from '../../test/helpers';

describe('jobs', () => {
  const t = useTestApp();

  /** Customer request + two masters with offers. */
  async function setup() {
    const c = await createCatalog(t.ctx.prisma);
    const customer = await login(t, '+998901112233', 'CUSTOMER');
    const cAuth = bearer(customer.accessToken);
    const created = await t.app.inject({
      method: 'POST',
      url: '/requests',
      headers: cAuth,
      payload: {
        categoryId: c.plumber.id,
        districtId: c.urganch.id,
        description: 'Kran oqyapti',
        address: 'Al-Xorazmiy 12',
        desiredTime: 'NOW',
      },
    });
    const requestId = created.json().id as string;
    const area = { categoryIds: [c.plumber.id], districtIds: [c.urganch.id] };
    const m1 = await createMaster(t, '+998905556601', { ...area, name: 'Akmal' });
    const m2 = await createMaster(t, '+998905556602', { ...area, name: 'Bekzod' });
    const offer = async (auth: Record<string, string>, price: number) =>
      (
        await t.app.inject({
          method: 'POST',
          url: `/master/requests/${requestId}/offers`,
          headers: auth,
          payload: { price, arrivalAt: '2026-01-01T10:00:00.000Z' },
        })
      ).json().id as string;
    const offer1 = await offer(m1.auth, 120_000);
    const offer2 = await offer(m2.auth, 150_000);
    return { c, cAuth, customer, requestId, m1, m2, offer1, offer2 };
  }

  async function accept(s: Awaited<ReturnType<typeof setup>>, offerId = s.offer1) {
    return t.app.inject({
      method: 'POST',
      url: `/requests/${s.requestId}/offers/${offerId}/accept`,
      headers: s.cAuth,
    });
  }

  const status = (jobId: string, auth: Record<string, string>, payload: object) =>
    t.app.inject({ method: 'POST', url: `/jobs/${jobId}/status`, headers: auth, payload });

  it('customer sees offers with master info', async () => {
    const s = await setup();
    const res = await t.app.inject({
      method: 'GET',
      url: `/requests/${s.requestId}/offers`,
      headers: s.cAuth,
    });
    const offers = res.json().map((o: unknown) => customerOfferDtoSchema.parse(o));
    expect(offers.map((o: { master: { name: string | null } }) => o.master.name)).toEqual([
      'Akmal',
      'Bekzod',
    ]);
    expect(offers[0].master.verified).toBe(true);
  });

  it("other customers can't see the offers", async () => {
    const s = await setup();
    const other = await login(t, '+998909998877', 'CUSTOMER');
    const res = await t.app.inject({
      method: 'GET',
      url: `/requests/${s.requestId}/offers`,
      headers: bearer(other.accessToken),
    });
    expect(res.statusCode).toBe(404);
  });

  it('accepting an offer creates a job and shares phones and address', async () => {
    const s = await setup();
    const res = await accept(s);

    expect(res.statusCode).toBe(201);
    const job = jobDtoSchema.parse(res.json());
    expect(job).toMatchObject({
      status: 'ACCEPTED',
      myRole: 'CUSTOMER',
      agreedPrice: 120_000,
      currentPrice: 120_000,
      master: { name: 'Akmal', phone: '+998905556601' },
      customer: { phone: '+998901112233' },
    });

    // The request is assigned, the other offer rejected, the master sees the address.
    const mine = await t.app.inject({ method: 'GET', url: '/requests/mine', headers: s.cAuth });
    expect(mine.json()[0]).toMatchObject({ status: 'ASSIGNED', jobId: job.id });
    const loser = await t.app.inject({ method: 'GET', url: '/master/offers', headers: s.m2.auth });
    expect(loser.json()[0].myOffer.status).toBe('REJECTED');
    const winner = await t.app.inject({
      method: 'GET',
      url: `/master/requests/${s.requestId}`,
      headers: s.m1.auth,
    });
    expect(winner.json().address).toBe('Al-Xorazmiy 12');
  });

  it('cannot accept twice', async () => {
    const s = await setup();
    await accept(s);
    const second = await accept(s, s.offer2);
    expect(second.json()).toEqual({ error: { code: 'REQUEST_NOT_OPEN' } });
  });

  it('runs the full status flow and starts the guarantee', async () => {
    const s = await setup();
    const jobId = (await accept(s)).json().id as string;

    const onTheWay = await status(jobId, s.m1.auth, { status: 'ON_THE_WAY', etaMinutes: 20 });
    expect(onTheWay.json()).toMatchObject({ status: 'ON_THE_WAY', onTheWayEtaMinutes: 20 });
    expect((await status(jobId, s.m1.auth, { status: 'IN_PROGRESS' })).json().status).toBe(
      'IN_PROGRESS',
    );
    const done = await status(jobId, s.m1.auth, { status: 'DONE' });

    expect(done.json()).toMatchObject({
      status: 'DONE',
      finalPrice: 120_000,
      guaranteeUntil: '2026-01-15T09:00:00.000Z',
    });
    const profile = await t.ctx.prisma.masterProfile.findUniqueOrThrow({
      where: { userId: s.m1.userId },
    });
    expect(profile.completedJobsCount).toBe(1);
  });

  it('does not allow skipping or going back', async () => {
    const s = await setup();
    const jobId = (await accept(s)).json().id as string;
    const skip = await status(jobId, s.m1.auth, { status: 'DONE' });
    expect(skip.json()).toEqual({ error: { code: 'JOB_STATUS_NOT_ALLOWED' } });
  });

  it('customer may only mark the job as done', async () => {
    const s = await setup();
    const jobId = (await accept(s)).json().id as string;
    const res = await status(jobId, s.cAuth, { status: 'ON_THE_WAY' });
    expect(res.statusCode).toBe(403);
  });

  it("strangers can't see or change the job", async () => {
    const s = await setup();
    const jobId = (await accept(s)).json().id as string;
    const view = await t.app.inject({ method: 'GET', url: `/jobs/${jobId}`, headers: s.m2.auth });
    expect(view.statusCode).toBe(404);
  });

  describe('price change', () => {
    async function proposal(s: Awaited<ReturnType<typeof setup>>, jobId: string) {
      const res = await t.app.inject({
        method: 'POST',
        url: `/jobs/${jobId}/price-changes`,
        headers: s.m1.auth,
        payload: { newPrice: 180_000, reason: 'Yangi kran kerak' },
      });
      return res.json().pendingPriceChange.id as string;
    }

    it('the final price changes only after the customer approves', async () => {
      const s = await setup();
      const jobId = (await accept(s)).json().id as string;
      const pcId = await proposal(s, jobId);

      // Can't finish while waiting for the customer's answer.
      await status(jobId, s.m1.auth, { status: 'IN_PROGRESS' });
      const blocked = await status(jobId, s.m1.auth, { status: 'DONE' });
      expect(blocked.json()).toEqual({ error: { code: 'PRICE_CHANGE_PENDING' } });

      const approved = await t.app.inject({
        method: 'POST',
        url: `/jobs/${jobId}/price-changes/${pcId}/approve`,
        headers: s.cAuth,
      });
      expect(approved.json()).toMatchObject({ currentPrice: 180_000, pendingPriceChange: null });

      const done = await status(jobId, s.m1.auth, { status: 'DONE' });
      expect(done.json().finalPrice).toBe(180_000);
    });

    it('a declined change keeps the agreed price', async () => {
      const s = await setup();
      const jobId = (await accept(s)).json().id as string;
      const pcId = await proposal(s, jobId);
      const declined = await t.app.inject({
        method: 'POST',
        url: `/jobs/${jobId}/price-changes/${pcId}/decline`,
        headers: s.cAuth,
      });
      expect(declined.json().currentPrice).toBe(120_000);
    });

    it('only the customer can approve, only the master can propose', async () => {
      const s = await setup();
      const jobId = (await accept(s)).json().id as string;
      const pcId = await proposal(s, jobId);
      const selfApprove = await t.app.inject({
        method: 'POST',
        url: `/jobs/${jobId}/price-changes/${pcId}/approve`,
        headers: s.m1.auth,
      });
      const customerProposes = await t.app.inject({
        method: 'POST',
        url: `/jobs/${jobId}/price-changes`,
        headers: s.cAuth,
        payload: { newPrice: 50_000, reason: 'Arzonroq' },
      });
      expect(selfApprove.statusCode).toBe(403);
      expect(customerProposes.statusCode).toBe(403);
    });

    it('one pending change at a time', async () => {
      const s = await setup();
      const jobId = (await accept(s)).json().id as string;
      await proposal(s, jobId);
      const second = await t.app.inject({
        method: 'POST',
        url: `/jobs/${jobId}/price-changes`,
        headers: s.m1.auth,
        payload: { newPrice: 200_000, reason: 'Yana bitta' },
      });
      expect(second.json()).toEqual({ error: { code: 'PRICE_CHANGE_PENDING' } });
    });

    it('rejects an invalid proposal', async () => {
      const s = await setup();
      const jobId = (await accept(s)).json().id as string;
      const res = await t.app.inject({
        method: 'POST',
        url: `/jobs/${jobId}/price-changes`,
        headers: s.m1.auth,
        payload: { newPrice: 10, reason: '' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('cancel', () => {
    it('master cancels → the request opens again', async () => {
      const s = await setup();
      const jobId = (await accept(s)).json().id as string;
      const res = await t.app.inject({
        method: 'POST',
        url: `/jobs/${jobId}/cancel`,
        headers: s.m1.auth,
        payload: { reason: "Kasal bo'lib qoldim" },
      });
      expect(res.json()).toMatchObject({ status: 'CANCELLED', cancelledByMe: true });
      const mine = await t.app.inject({ method: 'GET', url: '/requests/mine', headers: s.cAuth });
      expect(mine.json()[0].status).toBe('OPEN');
    });

    it('customer cancels → the request is cancelled', async () => {
      const s = await setup();
      const jobId = (await accept(s)).json().id as string;
      await t.app.inject({ method: 'POST', url: `/jobs/${jobId}/cancel`, headers: s.cAuth });
      const mine = await t.app.inject({ method: 'GET', url: '/requests/mine', headers: s.cAuth });
      expect(mine.json()[0].status).toBe('CANCELLED');
    });

    it('cannot cancel after the work started', async () => {
      const s = await setup();
      const jobId = (await accept(s)).json().id as string;
      await status(jobId, s.m1.auth, { status: 'IN_PROGRESS' });
      const res = await t.app.inject({
        method: 'POST',
        url: `/jobs/${jobId}/cancel`,
        headers: s.cAuth,
      });
      expect(res.json()).toEqual({ error: { code: 'JOB_STATUS_NOT_ALLOWED' } });
    });
  });

  it('GET /jobs lists jobs for both sides', async () => {
    const s = await setup();
    const jobId = (await accept(s)).json().id as string;
    const asCustomer = await t.app.inject({ method: 'GET', url: '/jobs', headers: s.cAuth });
    const asMaster = await t.app.inject({ method: 'GET', url: '/jobs', headers: s.m1.auth });
    expect(asCustomer.json()[0]).toMatchObject({ id: jobId, myRole: 'CUSTOMER' });
    expect(asMaster.json()[0]).toMatchObject({ id: jobId, myRole: 'MASTER' });
  });
});
