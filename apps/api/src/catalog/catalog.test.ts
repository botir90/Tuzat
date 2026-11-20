import { describe, expect, it } from 'vitest';
import { REGIONS } from '../../prisma/seed-data/regions';
import { seedCatalog } from '../../prisma/seed';
import { createMaster } from '../../test/fixtures';
import { useTestApp } from '../../test/helpers';

describe('catalog', () => {
  const t = useTestApp();

  /** Small fixture: one active and one inactive region, one category with prices. */
  async function fixture() {
    const { prisma } = t.ctx;
    const names = (s: string) => ({ nameUzLatn: s, nameUzCyrl: `${s}-cyrl`, nameRu: `${s}-ru` });
    const xorazm = await prisma.region.create({
      data: { slug: 'xorazm', isActive: true, sortOrder: 1, ...names('Xorazm') },
    });
    const buxoro = await prisma.region.create({
      data: { slug: 'buxoro', isActive: false, sortOrder: 0, ...names('Buxoro') },
    });
    const urganch = await prisma.district.create({
      data: { slug: 'urganch', regionId: xorazm.id, type: 'CITY', ...names('Urganch') },
    });
    const buxoroCity = await prisma.district.create({
      data: { slug: 'buxoro-sh', regionId: buxoro.id, ...names('Buxoro sh') },
    });
    const plumber = await prisma.category.create({
      data: { slug: 'plumber', icon: 'pipe-wrench', ...names('Santexnik') },
    });
    await prisma.category.create({
      data: { slug: 'hidden', icon: 'x', isActive: false, ...names('Hidden') },
    });
    const faucet = await prisma.priceItem.create({
      data: {
        slug: 'faucet',
        categoryId: plumber.id,
        minPrice: 80_000,
        maxPrice: 150_000,
        ...names('Kran'),
      },
    });
    await prisma.regionPrice.create({
      data: { priceItemId: faucet.id, regionId: buxoro.id, minPrice: 90_000, maxPrice: 170_000 },
    });
    return { xorazm, buxoro, urganch, buxoroCity, plumber };
  }

  it('GET /regions returns regions in sort order with 3-language names', async () => {
    await fixture();
    const res = await t.app.inject({ method: 'GET', url: '/regions' });

    expect(res.statusCode).toBe(200);
    expect(res.json().map((r: { slug: string }) => r.slug)).toEqual(['buxoro', 'xorazm']);
    expect(res.json()[1]).toMatchObject({
      isActive: true,
      name: { 'uz-Latn': 'Xorazm', 'uz-Cyrl': 'Xorazm-cyrl', ru: 'Xorazm-ru' },
    });
  });

  it('GET /regions/:id/districts returns the districts of a region', async () => {
    const { xorazm } = await fixture();
    const res = await t.app.inject({ method: 'GET', url: `/regions/${xorazm.id}/districts` });

    expect(res.json()).toEqual([expect.objectContaining({ slug: 'urganch', type: 'CITY' })]);
  });

  it('GET /regions/:id/districts returns 404 for an unknown region', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/regions/nope/districts' });
    expect(res.statusCode).toBe(404);
  });

  it('GET /categories returns only active categories', async () => {
    await fixture();
    const res = await t.app.inject({ method: 'GET', url: '/categories' });
    expect(res.json().map((c: { slug: string }) => c.slug)).toEqual(['plumber']);
  });

  it('GET /categories/:id/prices uses the region override when there is one', async () => {
    const { plumber, buxoro, xorazm } = await fixture();
    const base = await t.app.inject({
      method: 'GET',
      url: `/categories/${plumber.id}/prices?regionId=${xorazm.id}`,
    });
    const overridden = await t.app.inject({
      method: 'GET',
      url: `/categories/${plumber.id}/prices?regionId=${buxoro.id}`,
    });

    expect(base.json()[0]).toMatchObject({ minPrice: 80_000, maxPrice: 150_000 });
    expect(overridden.json()[0]).toMatchObject({ minPrice: 90_000, maxPrice: 170_000 });
  });

  it('GET /categories/:id/prices returns 404 for an unknown category', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/categories/nope/prices' });
    expect(res.statusCode).toBe(404);
  });

  it('GET /availability needs a launched region and a verified master', async () => {
    const { urganch, buxoroCity, plumber } = await fixture();
    const before = await t.app.inject({
      method: 'GET',
      url: `/availability?districtId=${urganch.id}`,
    });
    expect(before.json()).toEqual({ available: false });

    await createMaster(t, '+998905556677', {
      categoryIds: [plumber.id],
      districtIds: [urganch.id, buxoroCity.id],
    });
    const yes = await t.app.inject({
      method: 'GET',
      url: `/availability?districtId=${urganch.id}`,
    });
    const no = await t.app.inject({
      method: 'GET',
      url: `/availability?districtId=${buxoroCity.id}`,
    });

    expect(yes.json()).toEqual({ available: true });
    expect(no.json()).toEqual({ available: false });
  });

  it('GET /availability requires a districtId', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/availability' });
    expect(res.statusCode).toBe(400);
  });

  describe('POST /waitlist', () => {
    it('saves the request once, even if sent twice', async () => {
      const { buxoro, buxoroCity, plumber } = await fixture();
      const payload = {
        phone: '90 123 45 67',
        regionId: buxoro.id,
        districtId: buxoroCity.id,
        categoryId: plumber.id,
      };

      const first = await t.app.inject({ method: 'POST', url: '/waitlist', payload });
      await t.app.inject({ method: 'POST', url: '/waitlist', payload });

      expect(first.statusCode).toBe(201);
      const entries = await t.ctx.prisma.waitlistEntry.findMany();
      expect(entries).toHaveLength(1);
      expect(entries[0]?.phone).toBe('+998901234567');
    });

    it('rejects an invalid phone', async () => {
      const { buxoro } = await fixture();
      const res = await t.app.inject({
        method: 'POST',
        url: '/waitlist',
        payload: { phone: '1', regionId: buxoro.id },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects a district from another region', async () => {
      const { buxoro, urganch } = await fixture();
      const res = await t.app.inject({
        method: 'POST',
        url: '/waitlist',
        payload: { phone: '901234567', regionId: buxoro.id, districtId: urganch.id },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  it('GET /catalog/popular returns the first job of each category with region prices', async () => {
    const { plumber, buxoro } = await fixture();
    const res = await t.app.inject({
      method: 'GET',
      url: `/catalog/popular?regionId=${buxoro.id}`,
    });
    expect(res.json()).toEqual([
      expect.objectContaining({ categoryId: plumber.id, minPrice: 90_000 }),
    ]);
  });

  it('GET /masters/top lists verified masters of the region, best rated first', async () => {
    const { plumber, urganch, xorazm, buxoro } = await fixture();
    const good = await createMaster(t, '+998905556601', {
      categoryIds: [plumber.id],
      districtIds: [urganch.id],
      name: 'Akmal',
    });
    const better = await createMaster(t, '+998905556602', {
      categoryIds: [plumber.id],
      districtIds: [urganch.id],
      name: 'Bekzod',
    });
    await createMaster(t, '+998905556603', {
      categoryIds: [plumber.id],
      districtIds: [urganch.id],
      name: 'Pending',
      verified: false,
    });
    await t.ctx.prisma.masterProfile.update({
      where: { userId: good.userId },
      data: { ratingAvg: 4.5 },
    });
    await t.ctx.prisma.masterProfile.update({
      where: { userId: better.userId },
      data: { ratingAvg: 4.9 },
    });

    const inXorazm = await t.app.inject({
      method: 'GET',
      url: `/masters/top?regionId=${xorazm.id}`,
    });
    const inBuxoro = await t.app.inject({
      method: 'GET',
      url: `/masters/top?regionId=${buxoro.id}`,
    });

    expect(inXorazm.json().map((m: { name: string }) => m.name)).toEqual(['Bekzod', 'Akmal']);
    expect(inXorazm.json()[0].categoryName['uz-Latn']).toBe('Santexnik');
    expect(inBuxoro.json()).toEqual([]);
  });

  it('GET /category-groups returns groups with their active trades', async () => {
    const { prisma } = t.ctx;
    const group = await prisma.categoryGroup.create({
      data: { slug: 'repair', nameUzLatn: "Ta'mirlash", nameUzCyrl: 'Таъмирлаш', nameRu: 'Ремонт' },
    });
    await prisma.categoryGroup.create({
      data: { slug: 'empty', nameUzLatn: 'Bo‘sh', nameUzCyrl: 'Бўш', nameRu: 'Пусто' },
    });
    await prisma.category.create({
      data: {
        slug: 'plumber',
        icon: 'droplet',
        color: 'blue',
        groupId: group.id,
        nameUzLatn: 'Santexnik',
        nameUzCyrl: 'Сантехник',
        nameRu: 'Сантехник',
      },
    });
    const res = await t.app.inject({ method: 'GET', url: '/category-groups' });
    expect(res.json()).toEqual([
      expect.objectContaining({
        slug: 'repair',
        categories: [expect.objectContaining({ slug: 'plumber', icon: 'droplet', color: 'blue' })],
      }),
    ]);
  });

  it('seed creates all regions and districts and can run twice', async () => {
    await seedCatalog(t.ctx.prisma);
    await seedCatalog(t.ctx.prisma);

    const expectedDistricts = REGIONS.reduce(
      (sum, r) => sum + r.districts.length + r.cities.length,
      0,
    );
    expect(await t.ctx.prisma.region.count()).toBe(14);
    expect(await t.ctx.prisma.district.count()).toBe(expectedDistricts);
    // Only the pilot region is active at first.
    const active = await t.ctx.prisma.region.findMany({ where: { isActive: true } });
    expect(active.map((r) => r.slug)).toEqual(['xorazm']);

    // 36 trades in 4 groups (design/screens/Categories.html) + "Other", which is last.
    expect(await t.ctx.prisma.categoryGroup.count()).toBe(4);
    const categories = await t.ctx.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
    expect(categories).toHaveLength(37);
    expect(categories.at(-1)).toMatchObject({ slug: 'other', groupId: null });
    expect(categories.filter((c) => c.groupId === null)).toHaveLength(1);
  }, 120_000);
});
