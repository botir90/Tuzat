import { describe, expect, it } from 'vitest';
import { requestDtoSchema } from '@usta/shared';
import { createCatalog } from '../../test/fixtures';
import { bearer, login, useTestApp } from '../../test/helpers';

describe('requests', () => {
  const t = useTestApp();

  async function setup() {
    const catalog = await createCatalog(t.ctx.prisma);
    const customer = await login(t, '+998901112233', 'CUSTOMER');
    return { ...catalog, customer, auth: bearer(customer.accessToken) };
  }

  const validBody = (c: { plumber: { id: string }; urganch: { id: string } }) => ({
    categoryId: c.plumber.id,
    districtId: c.urganch.id,
    description: 'Oshxonada kran oqyapti',
    address: "Al-Xorazmiy ko'chasi 12, 5-xonadon",
    landmark: '5-maktab yonida',
    desiredTime: 'TODAY',
  });

  describe('POST /uploads/presign', () => {
    it('returns an upload URL inside the user folder', async () => {
      const { auth, customer } = await setup();
      const res = await t.app.inject({
        method: 'POST',
        url: '/uploads/presign',
        headers: auth,
        payload: { kind: 'request-photo', contentType: 'image/jpeg' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.key).toMatch(new RegExp(`^uploads/${customer.userId}/request-photo/.+\\.jpg$`));
      expect(body.uploadUrl).toContain('http://storage.test/');
      expect(body.headers).toEqual({ 'Content-Type': 'image/jpeg' });
    });

    it('rejects an unsupported file type', async () => {
      const { auth } = await setup();
      const res = await t.app.inject({
        method: 'POST',
        url: '/uploads/presign',
        headers: auth,
        payload: { kind: 'request-photo', contentType: 'application/pdf' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('requires login', async () => {
      const res = await t.app.inject({
        method: 'POST',
        url: '/uploads/presign',
        payload: { kind: 'request-photo', contentType: 'image/jpeg' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /requests', () => {
    it('creates an OPEN request that expires in 24 hours', async () => {
      const c = await setup();
      const res = await t.app.inject({
        method: 'POST',
        url: '/requests',
        headers: c.auth,
        payload: validBody(c),
      });

      expect(res.statusCode).toBe(201);
      const dto = requestDtoSchema.parse(res.json());
      expect(dto).toMatchObject({
        status: 'OPEN',
        landmark: '5-maktab yonida',
        expiresAt: '2026-01-02T09:00:00.000Z',
      });
    });

    it('attaches uploaded photos and voice', async () => {
      const c = await setup();
      const photo = `uploads/${c.customer.userId}/request-photo/a.jpg`;
      const voice = `uploads/${c.customer.userId}/request-voice/b.m4a`;
      t.storage.put(photo);
      t.storage.put(voice, 2000, 'audio/mp4');

      const res = await t.app.inject({
        method: 'POST',
        url: '/requests',
        headers: c.auth,
        payload: { ...validBody(c), description: undefined, photoKeys: [photo], voiceKey: voice },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().photoUrls).toEqual([`http://storage.test/download/${photo}`]);
      expect(res.json().voiceUrl).toBe(`http://storage.test/download/${voice}`);
    });

    it("rejects a file from someone else's folder", async () => {
      const c = await setup();
      const stolen = 'uploads/other-user/request-photo/a.jpg';
      t.storage.put(stolen);
      const res = await t.app.inject({
        method: 'POST',
        url: '/requests',
        headers: c.auth,
        payload: { ...validBody(c), photoKeys: [stolen] },
      });
      expect(res.json()).toEqual({ error: { code: 'UPLOAD_NOT_FOUND' } });
    });

    it('rejects a photo that was never uploaded', async () => {
      const c = await setup();
      const res = await t.app.inject({
        method: 'POST',
        url: '/requests',
        headers: c.auth,
        payload: {
          ...validBody(c),
          photoKeys: [`uploads/${c.customer.userId}/request-photo/missing.jpg`],
        },
      });
      expect(res.json()).toEqual({ error: { code: 'UPLOAD_NOT_FOUND' } });
    });

    it('needs a description, a photo or a voice message', async () => {
      const c = await setup();
      const res = await t.app.inject({
        method: 'POST',
        url: '/requests',
        headers: c.auth,
        payload: { ...validBody(c), description: '' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects more than 5 photos', async () => {
      const c = await setup();
      const keys = Array.from({ length: 6 }, (_, i) => `uploads/x/request-photo/${i}.jpg`);
      const res = await t.app.inject({
        method: 'POST',
        url: '/requests',
        headers: c.auth,
        payload: { ...validBody(c), photoKeys: keys },
      });
      expect(res.statusCode).toBe(400);
    });

    it('requires a future scheduledAt for SCHEDULED', async () => {
      const c = await setup();
      const past = await t.app.inject({
        method: 'POST',
        url: '/requests',
        headers: c.auth,
        payload: { ...validBody(c), desiredTime: 'SCHEDULED', scheduledAt: '2025-12-31T09:00:00Z' },
      });
      const missing = await t.app.inject({
        method: 'POST',
        url: '/requests',
        headers: c.auth,
        payload: { ...validBody(c), desiredTime: 'SCHEDULED' },
      });
      const ok = await t.app.inject({
        method: 'POST',
        url: '/requests',
        headers: c.auth,
        payload: { ...validBody(c), desiredTime: 'SCHEDULED', scheduledAt: '2026-01-02T10:00:00Z' },
      });

      expect(past.statusCode).toBe(400);
      expect(missing.statusCode).toBe(400);
      expect(ok.statusCode).toBe(201);
    });

    it('refuses regions where we have not launched', async () => {
      const c = await setup();
      const res = await t.app.inject({
        method: 'POST',
        url: '/requests',
        headers: c.auth,
        payload: { ...validBody(c), districtId: c.buxoroCity.id },
      });
      expect(res.json()).toEqual({ error: { code: 'REGION_NOT_ACTIVE' } });
    });

    it('allows at most 3 open requests', async () => {
      const c = await setup();
      for (let i = 0; i < 3; i++) {
        const ok = await t.app.inject({
          method: 'POST',
          url: '/requests',
          headers: c.auth,
          payload: validBody(c),
        });
        expect(ok.statusCode).toBe(201);
      }
      const fourth = await t.app.inject({
        method: 'POST',
        url: '/requests',
        headers: c.auth,
        payload: validBody(c),
      });
      expect(fourth.json()).toEqual({ error: { code: 'TOO_MANY_OPEN_REQUESTS' } });

      // After 24 h the old ones expire, so a new request is allowed again.
      t.clock.advance(25 * 3_600_000);
      // The 15-minute access token has expired too, so log in again.
      const again = await login(t, '+998901112233');
      const later = await t.app.inject({
        method: 'POST',
        url: '/requests',
        headers: bearer(again.accessToken),
        payload: validBody(c),
      });
      expect(later.statusCode).toBe(201);
    });

    it('requires login', async () => {
      const c = await createCatalog(t.ctx.prisma);
      const res = await t.app.inject({ method: 'POST', url: '/requests', payload: validBody(c) });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('reading and cancelling', () => {
    async function createOne(c: Awaited<ReturnType<typeof setup>>) {
      const res = await t.app.inject({
        method: 'POST',
        url: '/requests',
        headers: c.auth,
        payload: validBody(c),
      });
      return res.json().id as string;
    }

    it('GET /requests/mine lists only my requests, newest first', async () => {
      const c = await setup();
      const first = await createOne(c);
      t.clock.advance(1000);
      const second = await createOne(c);
      const other = await login(t, '+998909998877', 'CUSTOMER');

      const mine = await t.app.inject({ method: 'GET', url: '/requests/mine', headers: c.auth });
      const theirs = await t.app.inject({
        method: 'GET',
        url: '/requests/mine',
        headers: bearer(other.accessToken),
      });

      expect(mine.json().map((r: { id: string }) => r.id)).toEqual([second, first]);
      expect(theirs.json()).toEqual([]);
    });

    it('shows EXPIRED after 24 hours', async () => {
      const c = await setup();
      const id = await createOne(c);
      t.clock.advance(24 * 3_600_000 + 1);
      const again = await login(t, '+998901112233');
      const res = await t.app.inject({
        method: 'GET',
        url: `/requests/${id}`,
        headers: bearer(again.accessToken),
      });
      expect(res.json().status).toBe('EXPIRED');
    });

    it("hides other people's requests", async () => {
      const c = await setup();
      const id = await createOne(c);
      const other = await login(t, '+998909998877', 'CUSTOMER');
      const res = await t.app.inject({
        method: 'GET',
        url: `/requests/${id}`,
        headers: bearer(other.accessToken),
      });
      expect(res.statusCode).toBe(404);
    });

    it('cancels an open request once', async () => {
      const c = await setup();
      const id = await createOne(c);
      const cancel = () =>
        t.app.inject({ method: 'POST', url: `/requests/${id}/cancel`, headers: c.auth });

      const first = await cancel();
      const second = await cancel();
      expect(first.json().status).toBe('CANCELLED');
      expect(second.statusCode).toBe(409);
    });
  });
});
