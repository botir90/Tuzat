import { describe, expect, it } from 'vitest';
import { feedItemDtoSchema, masterProfileDtoSchema } from '@usta/shared';
import { createCatalog, createMaster } from '../../test/fixtures';
import { bearer, login, useTestApp, type TestApp } from '../../test/helpers';

/** Creates a customer request in Urganch (plumber) and returns its id. */
async function createRequest(
  t: TestApp,
  c: Awaited<ReturnType<typeof createCatalog>>,
  phone = '+998901112233',
  overrides: Record<string, unknown> = {},
) {
  const customer = await login(t, phone, 'CUSTOMER');
  const res = await t.app.inject({
    method: 'POST',
    url: '/requests',
    headers: bearer(customer.accessToken),
    payload: {
      categoryId: c.plumber.id,
      districtId: c.urganch.id,
      description: 'Kran oqyapti',
      address: 'Secret street 1',
      landmark: 'Secret landmark',
      desiredTime: 'NOW',
      ...overrides,
    },
  });
  if (res.statusCode !== 201) throw new Error(res.body);
  return { id: res.json().id as string, customer };
}

const offerBody = { price: 120_000, arrivalAt: '2026-01-01T10:00:00.000Z', message: 'Boraman' };

describe('master', () => {
  const t = useTestApp();

  describe('profile', () => {
    it('creates a profile waiting for verification', async () => {
      const c = await createCatalog(t.ctx.prisma);
      const m = await createMaster(t, '+998905556677', {
        categoryIds: [c.plumber.id],
        districtIds: [c.urganch.id],
        verified: false,
      });
      const res = await t.app.inject({ method: 'GET', url: '/master/profile', headers: m.auth });

      const profile = masterProfileDtoSchema.parse(res.json());
      expect(profile).toMatchObject({ name: 'Usta Akmal', verificationStatus: 'PENDING' });
      expect(profile.categories.map((x) => x.id)).toEqual([c.plumber.id]);
    });

    it('only masters can have a profile', async () => {
      const c = await createCatalog(t.ctx.prisma);
      const customer = await login(t, '+998901112233', 'CUSTOMER');
      const res = await t.app.inject({
        method: 'PUT',
        url: '/master/profile',
        headers: bearer(customer.accessToken),
        payload: { name: 'X Y', categoryIds: [c.plumber.id], districtIds: [c.urganch.id] },
      });
      expect(res.json()).toEqual({ error: { code: 'NOT_A_MASTER' } });
    });

    it('validates categories and districts', async () => {
      const master = await login(t, '+998905556677', 'MASTER');
      const empty = await t.app.inject({
        method: 'PUT',
        url: '/master/profile',
        headers: bearer(master.accessToken),
        payload: { name: 'Akmal', categoryIds: [], districtIds: [] },
      });
      const unknown = await t.app.inject({
        method: 'PUT',
        url: '/master/profile',
        headers: bearer(master.accessToken),
        payload: { name: 'Akmal', categoryIds: ['nope'], districtIds: ['nope'] },
      });
      expect(empty.statusCode).toBe(400);
      expect(unknown.statusCode).toBe(404);
    });

    it('a rejected profile goes back to PENDING after editing', async () => {
      const c = await createCatalog(t.ctx.prisma);
      const m = await createMaster(t, '+998905556677', {
        categoryIds: [c.plumber.id],
        districtIds: [c.urganch.id],
        verified: false,
      });
      await t.ctx.prisma.masterProfile.update({
        where: { userId: m.userId },
        data: { verificationStatus: 'REJECTED', rejectionReason: 'Blurry passport' },
      });
      const res = await t.app.inject({
        method: 'PUT',
        url: '/master/profile',
        headers: m.auth,
        payload: { name: 'Akmal', categoryIds: [c.plumber.id], districtIds: [c.xiva.id] },
      });
      expect(res.json()).toMatchObject({ verificationStatus: 'PENDING', rejectionReason: null });
    });

    it('toggles availability', async () => {
      const c = await createCatalog(t.ctx.prisma);
      const m = await createMaster(t, '+998905556677', {
        categoryIds: [c.plumber.id],
        districtIds: [c.urganch.id],
      });
      const res = await t.app.inject({
        method: 'PUT',
        url: '/master/availability',
        headers: m.auth,
        payload: { isAvailable: false },
      });
      expect(res.json().isAvailable).toBe(false);
    });
  });

  describe('feed', () => {
    it('shows matching requests without the exact address', async () => {
      const c = await createCatalog(t.ctx.prisma);
      const m = await createMaster(t, '+998905556677', {
        categoryIds: [c.plumber.id],
        districtIds: [c.urganch.id],
      });
      const { id } = await createRequest(t, c);

      const res = await t.app.inject({ method: 'GET', url: '/master/feed', headers: m.auth });
      const items = res.json().map((x: unknown) => feedItemDtoSchema.parse(x));

      expect(items.map((x: { id: string }) => x.id)).toEqual([id]);
      expect(items[0]).toMatchObject({ address: null, landmark: null, myOffer: null });
    });

    it('hides requests from other categories and districts', async () => {
      const c = await createCatalog(t.ctx.prisma);
      const m = await createMaster(t, '+998905556677', {
        categoryIds: [c.plumber.id],
        districtIds: [c.urganch.id],
      });
      await createRequest(t, c, '+998901112233', { categoryId: c.electrician.id });
      await createRequest(t, c, '+998901112244', { districtId: c.xiva.id });

      const res = await t.app.inject({ method: 'GET', url: '/master/feed', headers: m.auth });
      expect(res.json()).toEqual([]);
    });

    it('is closed for unverified or unavailable masters', async () => {
      const c = await createCatalog(t.ctx.prisma);
      const pending = await createMaster(t, '+998905556677', {
        categoryIds: [c.plumber.id],
        districtIds: [c.urganch.id],
        verified: false,
      });
      const off = await createMaster(t, '+998905556688', {
        categoryIds: [c.plumber.id],
        districtIds: [c.urganch.id],
      });
      await t.ctx.prisma.masterProfile.update({
        where: { userId: off.userId },
        data: { isAvailable: false },
      });

      const a = await t.app.inject({ method: 'GET', url: '/master/feed', headers: pending.auth });
      const b = await t.app.inject({ method: 'GET', url: '/master/feed', headers: off.auth });
      expect(a.json()).toEqual({ error: { code: 'MASTER_NOT_VERIFIED' } });
      expect(b.json()).toEqual({ error: { code: 'MASTER_NOT_AVAILABLE' } });
    });

    it('notifies matching masters about a new request', async () => {
      const c = await createCatalog(t.ctx.prisma);
      const m = await createMaster(t, '+998905556677', {
        categoryIds: [c.plumber.id],
        districtIds: [c.urganch.id],
      });
      await t.app.inject({
        method: 'POST',
        url: '/push-tokens',
        headers: m.auth,
        payload: { token: 'ExponentPushToken[master-phone]', platform: 'android' },
      });

      await createRequest(t, c);
      await t.ctx.background.drain();

      expect(t.push.sent).toEqual([
        expect.objectContaining({
          to: 'ExponentPushToken[master-phone]',
          title: 'Yangi buyurtma',
          body: 'Santexnik — Urganch',
        }),
      ]);
    });
  });

  describe('offers', () => {
    it('sends an offer and notifies the customer', async () => {
      const c = await createCatalog(t.ctx.prisma);
      const m = await createMaster(t, '+998905556677', {
        categoryIds: [c.plumber.id],
        districtIds: [c.urganch.id],
      });
      const { id, customer } = await createRequest(t, c);
      await t.app.inject({
        method: 'POST',
        url: '/push-tokens',
        headers: bearer(customer.accessToken),
        payload: { token: 'ExponentPushToken[customer-phone]', platform: 'android' },
      });

      const res = await t.app.inject({
        method: 'POST',
        url: `/master/requests/${id}/offers`,
        headers: m.auth,
        payload: offerBody,
      });
      await t.ctx.background.drain();

      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ price: 120_000, status: 'SENT' });
      expect(t.push.sent.at(-1)).toMatchObject({
        to: 'ExponentPushToken[customer-phone]',
        body: "Usta Akmal: 120 000 so'm",
      });

      const mine = await t.app.inject({
        method: 'GET',
        url: '/requests/mine',
        headers: bearer(customer.accessToken),
      });
      expect(mine.json()[0].offerCount).toBe(1);
    });

    it('allows only one offer per master', async () => {
      const c = await createCatalog(t.ctx.prisma);
      const m = await createMaster(t, '+998905556677', {
        categoryIds: [c.plumber.id],
        districtIds: [c.urganch.id],
      });
      const { id } = await createRequest(t, c);
      const send = () =>
        t.app.inject({
          method: 'POST',
          url: `/master/requests/${id}/offers`,
          headers: m.auth,
          payload: offerBody,
        });
      await send();
      expect((await send()).json()).toEqual({ error: { code: 'OFFER_ALREADY_SENT' } });
    });

    it('allows at most 5 offers per request', async () => {
      const c = await createCatalog(t.ctx.prisma);
      const { id } = await createRequest(t, c);
      for (let i = 0; i < 6; i++) {
        const m = await createMaster(t, `+99890555660${i}`, {
          categoryIds: [c.plumber.id],
          districtIds: [c.urganch.id],
        });
        const res = await t.app.inject({
          method: 'POST',
          url: `/master/requests/${id}/offers`,
          headers: m.auth,
          payload: offerBody,
        });
        if (i < 5) expect(res.statusCode).toBe(201);
        else expect(res.json()).toEqual({ error: { code: 'TOO_MANY_OFFERS' } });
      }
    });

    it('cannot answer a request outside my area', async () => {
      const c = await createCatalog(t.ctx.prisma);
      const m = await createMaster(t, '+998905556677', {
        categoryIds: [c.plumber.id],
        districtIds: [c.xiva.id],
      });
      const { id } = await createRequest(t, c);
      const res = await t.app.inject({
        method: 'POST',
        url: `/master/requests/${id}/offers`,
        headers: m.auth,
        payload: offerBody,
      });
      expect(res.statusCode).toBe(404);
    });

    it('cannot answer a cancelled request', async () => {
      const c = await createCatalog(t.ctx.prisma);
      const m = await createMaster(t, '+998905556677', {
        categoryIds: [c.plumber.id],
        districtIds: [c.urganch.id],
      });
      const { id, customer } = await createRequest(t, c);
      await t.app.inject({
        method: 'POST',
        url: `/requests/${id}/cancel`,
        headers: bearer(customer.accessToken),
      });
      const res = await t.app.inject({
        method: 'POST',
        url: `/master/requests/${id}/offers`,
        headers: m.auth,
        payload: offerBody,
      });
      expect(res.json()).toEqual({ error: { code: 'REQUEST_NOT_OPEN' } });
    });

    it('rejects an invalid price', async () => {
      const c = await createCatalog(t.ctx.prisma);
      const m = await createMaster(t, '+998905556677', {
        categoryIds: [c.plumber.id],
        districtIds: [c.urganch.id],
      });
      const { id } = await createRequest(t, c);
      const res = await t.app.inject({
        method: 'POST',
        url: `/master/requests/${id}/offers`,
        headers: m.auth,
        payload: { ...offerBody, price: -5 },
      });
      expect(res.statusCode).toBe(400);
    });

    it('withdraws an offer and can send a new one', async () => {
      const c = await createCatalog(t.ctx.prisma);
      const m = await createMaster(t, '+998905556677', {
        categoryIds: [c.plumber.id],
        districtIds: [c.urganch.id],
      });
      const { id } = await createRequest(t, c);
      const sent = await t.app.inject({
        method: 'POST',
        url: `/master/requests/${id}/offers`,
        headers: m.auth,
        payload: offerBody,
      });
      const withdrawn = await t.app.inject({
        method: 'POST',
        url: `/master/offers/${sent.json().id}/withdraw`,
        headers: m.auth,
      });
      const again = await t.app.inject({
        method: 'POST',
        url: `/master/requests/${id}/offers`,
        headers: m.auth,
        payload: { ...offerBody, price: 100_000 },
      });

      expect(withdrawn.json().status).toBe('WITHDRAWN');
      expect(again.json()).toMatchObject({ status: 'SENT', price: 100_000 });
    });

    it('lists my offers with their requests', async () => {
      const c = await createCatalog(t.ctx.prisma);
      const m = await createMaster(t, '+998905556677', {
        categoryIds: [c.plumber.id],
        districtIds: [c.urganch.id],
      });
      const { id } = await createRequest(t, c);
      await t.app.inject({
        method: 'POST',
        url: `/master/requests/${id}/offers`,
        headers: m.auth,
        payload: offerBody,
      });
      const res = await t.app.inject({ method: 'GET', url: '/master/offers', headers: m.auth });
      expect(res.json()).toEqual([
        expect.objectContaining({ id, myOffer: expect.objectContaining({ price: 120_000 }) }),
      ]);
    });
  });
});
