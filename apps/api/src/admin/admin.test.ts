import { describe, expect, it } from 'vitest';
import { createCatalog, createJob, createMaster } from '../../test/fixtures';
import { bearer, login, useTestApp, type TestApp } from '../../test/helpers';
import { hashPassword, verifyPassword } from './password';

const PASSWORD = 'very-secret-password';

async function adminAuth(t: TestApp): Promise<Record<string, string>> {
  await t.ctx.prisma.adminUser.create({
    data: { username: 'botir', passwordHash: await hashPassword(PASSWORD) },
  });
  const res = await t.app.inject({
    method: 'POST',
    url: '/admin/auth/login',
    payload: { username: 'botir', password: PASSWORD },
  });
  return bearer(res.json().token);
}

describe('admin', () => {
  const t = useTestApp();

  describe('password hashing', () => {
    it('verifies the right password only', async () => {
      const hash = await hashPassword(PASSWORD);
      expect(hash).not.toContain(PASSWORD);
      expect(await verifyPassword(PASSWORD, hash)).toBe(true);
      expect(await verifyPassword('wrong-password', hash)).toBe(false);
      expect(await verifyPassword(PASSWORD, 'garbage')).toBe(false);
    });
  });

  describe('login', () => {
    it('logs in and opens admin routes', async () => {
      const auth = await adminAuth(t);
      const me = await t.app.inject({ method: 'GET', url: '/admin/me', headers: auth });
      expect(me.json()).toEqual({ username: 'botir' });
    });

    it('rejects a wrong password and locks after 5 tries', async () => {
      await adminAuth(t);
      const attempt = (password: string) =>
        t.app.inject({
          method: 'POST',
          url: '/admin/auth/login',
          payload: { username: 'botir', password },
        });
      for (let i = 0; i < 5; i++) {
        expect((await attempt('wrong-password')).json()).toEqual({
          error: { code: 'ADMIN_LOGIN_FAILED' },
        });
      }
      // Even the right password is refused while locked.
      expect((await attempt(PASSWORD)).statusCode).toBe(429);
    });

    it('an app token cannot open the admin panel, and vice versa', async () => {
      const adminHeaders = await adminAuth(t);
      const user = await login(t, '+998901112233', 'CUSTOMER');
      const asApp = await t.app.inject({
        method: 'GET',
        url: '/admin/stats',
        headers: bearer(user.accessToken),
      });
      const asAdmin = await t.app.inject({ method: 'GET', url: '/me', headers: adminHeaders });
      expect(asApp.statusCode).toBe(401);
      expect(asAdmin.statusCode).toBe(401);
    });

    it('allows the admin panel origin (CORS)', async () => {
      const res = await t.app.inject({
        method: 'OPTIONS',
        url: '/admin/auth/login',
        headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'POST' },
      });
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
  });

  describe('masters and users', () => {
    it('lists pending masters, verifies and rejects them', async () => {
      const auth = await adminAuth(t);
      const c = await createCatalog(t.ctx.prisma);
      const area = { categoryIds: [c.plumber.id], districtIds: [c.urganch.id], verified: false };
      const a = await createMaster(t, '+998905556601', { ...area, name: 'Akmal' });
      const b = await createMaster(t, '+998905556602', { ...area, name: 'Bekzod' });

      const pending = await t.app.inject({
        method: 'GET',
        url: '/admin/masters?status=PENDING',
        headers: auth,
      });
      expect(
        pending
          .json()
          .items.map((m: { name: string }) => m.name)
          .sort(),
      ).toEqual(['Akmal', 'Bekzod']);

      await t.app.inject({
        method: 'POST',
        url: `/admin/masters/${a.userId}/verify`,
        headers: auth,
      });
      const rejected = await t.app.inject({
        method: 'POST',
        url: `/admin/masters/${b.userId}/reject`,
        headers: auth,
        payload: { reason: 'Pasport surati xira' },
      });
      expect(rejected.statusCode).toBe(204);

      const profiles = await t.ctx.prisma.masterProfile.findMany({ orderBy: { userId: 'asc' } });
      const byUser = Object.fromEntries(profiles.map((p) => [p.userId, p]));
      expect(byUser[a.userId]?.verificationStatus).toBe('VERIFIED');
      expect(byUser[b.userId]).toMatchObject({
        verificationStatus: 'REJECTED',
        rejectionReason: 'Pasport surati xira',
      });
    });

    it('pages through masters', async () => {
      const auth = await adminAuth(t);
      const c = await createCatalog(t.ctx.prisma);
      for (let i = 0; i < 3; i++) {
        await createMaster(t, `+99890555660${i}`, {
          categoryIds: [c.plumber.id],
          districtIds: [c.urganch.id],
        });
        t.clock.advance(1000);
      }
      const first = await t.app.inject({
        method: 'GET',
        url: '/admin/masters?limit=2',
        headers: auth,
      });
      const second = await t.app.inject({
        method: 'GET',
        url: `/admin/masters?limit=2&cursor=${first.json().nextCursor}`,
        headers: auth,
      });
      expect(first.json().items).toHaveLength(2);
      expect(second.json().items).toHaveLength(1);
      expect(second.json().nextCursor).toBeNull();
    });

    it('blocking ends sessions and hides the master', async () => {
      const auth = await adminAuth(t);
      const c = await createCatalog(t.ctx.prisma);
      const m = await createMaster(t, '+998905556677', {
        categoryIds: [c.plumber.id],
        districtIds: [c.urganch.id],
      });

      const block = await t.app.inject({
        method: 'POST',
        url: `/admin/users/${m.userId}/block`,
        headers: auth,
      });
      expect(block.statusCode).toBe(204);
      const refresh = await t.app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: { refreshToken: m.refreshToken },
      });
      expect(refresh.statusCode).toBe(401);
      const profile = await t.ctx.prisma.masterProfile.findUniqueOrThrow({
        where: { userId: m.userId },
      });
      expect(profile.isAvailable).toBe(false);

      const found = await t.app.inject({
        method: 'GET',
        url: '/admin/users?phone=5556677',
        headers: auth,
      });
      expect(found.json().items[0]).toMatchObject({ phone: '+998905556677', isBlocked: true });
    });
  });

  describe('catalog', () => {
    it('opens a region for customers', async () => {
      const auth = await adminAuth(t);
      const c = await createCatalog(t.ctx.prisma);
      await t.app.inject({
        method: 'PATCH',
        url: `/admin/regions/${c.buxoro.id}`,
        headers: auth,
        payload: { isActive: true },
      });
      const regions = await t.app.inject({ method: 'GET', url: '/admin/regions', headers: auth });
      expect(regions.json().every((r: { isActive: boolean }) => r.isActive)).toBe(true);
    });

    it('adds a new trade into a new group without code changes', async () => {
      const auth = await adminAuth(t);
      const group = await t.app.inject({
        method: 'POST',
        url: '/admin/category-groups',
        headers: auth,
        payload: {
          slug: 'auto',
          nameUzLatn: 'Avto',
          nameUzCyrl: 'Авто',
          nameRu: 'Авто',
          sortOrder: 5,
        },
      });
      expect(group.statusCode).toBe(201);

      const trade = {
        slug: 'tire-service',
        nameUzLatn: 'Shinomontaj',
        nameUzCyrl: 'Шиномонтаж',
        nameRu: 'Шиномонтаж',
        icon: 'truck',
        color: 'blue',
        groupId: group.json().id,
        sortOrder: 50,
        isActive: true,
      };
      const created = await t.app.inject({
        method: 'POST',
        url: '/admin/categories',
        headers: auth,
        payload: trade,
      });
      expect(created.statusCode).toBe(201);

      // The app sees it right away, inside its group.
      const groups = await t.app.inject({ method: 'GET', url: '/category-groups' });
      expect(groups.json()).toEqual([
        expect.objectContaining({
          slug: 'auto',
          categories: [expect.objectContaining({ slug: 'tire-service', icon: 'truck' })],
        }),
      ]);

      // Unknown icons and groups are refused.
      const badIcon = await t.app.inject({
        method: 'POST',
        url: '/admin/categories',
        headers: auth,
        payload: { ...trade, slug: 'x-1', icon: 'not-an-icon' },
      });
      const badGroup = await t.app.inject({
        method: 'POST',
        url: '/admin/categories',
        headers: auth,
        payload: { ...trade, slug: 'x-2', groupId: 'nope' },
      });
      expect(badIcon.statusCode).toBe(400);
      expect(badGroup.statusCode).toBe(404);
    });

    it('creates and edits categories, refusing a duplicate slug', async () => {
      const auth = await adminAuth(t);
      const body = {
        slug: 'painter',
        nameUzLatn: "Bo'yoqchi",
        nameUzCyrl: 'Бўёқчи',
        nameRu: 'Маляр',
        icon: 'paintbrush',
        color: 'pink',
        groupId: null,
        sortOrder: 10,
        isActive: true,
      };
      const created = await t.app.inject({
        method: 'POST',
        url: '/admin/categories',
        headers: auth,
        payload: body,
      });
      const duplicate = await t.app.inject({
        method: 'POST',
        url: '/admin/categories',
        headers: auth,
        payload: body,
      });
      const edited = await t.app.inject({
        method: 'PUT',
        url: `/admin/categories/${created.json().id}`,
        headers: auth,
        payload: { ...body, isActive: false },
      });

      expect(created.statusCode).toBe(201);
      expect(duplicate.statusCode).toBe(409);
      expect(edited.json().isActive).toBe(false);
    });

    it('manages prices and a region override', async () => {
      const auth = await adminAuth(t);
      const c = await createCatalog(t.ctx.prisma);
      const item = {
        slug: 'plumber-faucet',
        categoryId: c.plumber.id,
        nameUzLatn: 'Kran',
        nameUzCyrl: 'Кран',
        nameRu: 'Кран',
        minPrice: 80_000,
        maxPrice: 150_000,
        sortOrder: 0,
      };
      const bad = await t.app.inject({
        method: 'POST',
        url: '/admin/price-items',
        headers: auth,
        payload: { ...item, minPrice: 200_000 },
      });
      expect(bad.statusCode).toBe(400);

      const created = await t.app.inject({
        method: 'POST',
        url: '/admin/price-items',
        headers: auth,
        payload: item,
      });
      const id = created.json().id as string;
      await t.app.inject({
        method: 'PUT',
        url: `/admin/price-items/${id}/regions/${c.xorazm.id}`,
        headers: auth,
        payload: { minPrice: 70_000, maxPrice: 120_000 },
      });

      const prices = await t.app.inject({
        method: 'GET',
        url: `/categories/${c.plumber.id}/prices?regionId=${c.xorazm.id}`,
      });
      expect(prices.json()[0]).toMatchObject({ minPrice: 70_000, maxPrice: 120_000 });
    });
  });

  describe('orders and cases', () => {
    it('shows requests, claims, complaints and resolves them', async () => {
      const auth = await adminAuth(t);
      const s = await createJob(t);
      await t.app.inject({
        method: 'POST',
        url: `/jobs/${s.jobId}/guarantee-claims`,
        headers: s.customerAuth,
        payload: { description: 'Kran yana oqyapti' },
      });
      await t.app.inject({
        method: 'POST',
        url: `/jobs/${s.jobId}/complaints`,
        headers: s.master.auth,
        payload: { text: "Mijoz to'lovni kechiktirdi" },
      });

      const requests = await t.app.inject({ method: 'GET', url: '/admin/requests', headers: auth });
      expect(requests.json().items[0]).toMatchObject({
        status: 'ASSIGNED',
        job: { status: 'DONE', masterName: 'Akmal Karimov', price: 120_000 },
      });

      const stats = await t.app.inject({ method: 'GET', url: '/admin/stats', headers: auth });
      expect(stats.json()).toMatchObject({ openClaims: 1, openComplaints: 1 });

      const claims = await t.app.inject({
        method: 'GET',
        url: '/admin/claims?status=OPEN',
        headers: auth,
      });
      const complaints = await t.app.inject({
        method: 'GET',
        url: '/admin/complaints?status=OPEN',
        headers: auth,
      });
      expect(complaints.json().items[0]).toMatchObject({ fromPhone: '+998905556677' });

      const resolve = (url: string, payload: object) =>
        t.app.inject({ method: 'POST', url, headers: auth, payload });
      const claimId = claims.json().items[0].id as string;
      const complaintId = complaints.json().items[0].id as string;
      expect(
        (
          await resolve(`/admin/claims/${claimId}/resolve`, {
            status: 'RESOLVED',
            adminNote: 'Usta bordi',
          })
        ).statusCode,
      ).toBe(204);
      expect((await resolve(`/admin/complaints/${complaintId}/resolve`, {})).statusCode).toBe(204);
      // Resolving twice is refused.
      expect(
        (await resolve(`/admin/claims/${claimId}/resolve`, { status: 'REJECTED' })).statusCode,
      ).toBe(409);

      const after = await t.app.inject({ method: 'GET', url: '/admin/stats', headers: auth });
      expect(after.json()).toMatchObject({ openClaims: 0, openComplaints: 0 });
    });

    it('groups the waitlist by place and category', async () => {
      const auth = await adminAuth(t);
      const c = await createCatalog(t.ctx.prisma);
      for (const phone of ['901111111', '902222222']) {
        await t.app.inject({
          method: 'POST',
          url: '/waitlist',
          payload: {
            phone,
            regionId: c.buxoro.id,
            districtId: c.buxoroCity.id,
            categoryId: c.plumber.id,
          },
        });
      }
      const res = await t.app.inject({ method: 'GET', url: '/admin/waitlist', headers: auth });
      expect(res.json()).toEqual([
        { region: 'Buxoro', district: 'Buxoro', category: 'Santexnik', count: 2 },
      ]);
    });
  });
});
