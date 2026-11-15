import type { PrismaClient } from '../src/generated/prisma/client';

const names = (s: string) => ({ nameUzLatn: s, nameUzCyrl: `${s}-cyrl`, nameRu: `${s}-ru` });

/** A tiny catalog: active Xorazm with Urganch, inactive Buxoro, one category. */
export async function createCatalog(prisma: PrismaClient) {
  const xorazm = await prisma.region.create({
    data: { slug: 'xorazm', isActive: true, ...names('Xorazm') },
  });
  const buxoro = await prisma.region.create({
    data: { slug: 'buxoro', isActive: false, ...names('Buxoro') },
  });
  const urganch = await prisma.district.create({
    data: { slug: 'urganch', regionId: xorazm.id, type: 'CITY', ...names('Urganch') },
  });
  const xiva = await prisma.district.create({
    data: { slug: 'xiva', regionId: xorazm.id, type: 'CITY', ...names('Xiva') },
  });
  const buxoroCity = await prisma.district.create({
    data: { slug: 'buxoro-sh', regionId: buxoro.id, ...names('Buxoro') },
  });
  const plumber = await prisma.category.create({
    data: { slug: 'plumber', icon: 'pipe-wrench', ...names('Santexnik') },
  });
  const electrician = await prisma.category.create({
    data: { slug: 'electrician', icon: 'flash', ...names('Elektrik') },
  });
  return { xorazm, buxoro, urganch, xiva, buxoroCity, plumber, electrician };
}

/**
 * Logs in as a master, fills the profile and (by default) verifies it.
 * Returns the login tokens and the user id.
 */
export async function createMaster(
  t: import('./helpers').TestApp,
  phone: string,
  opts: { categoryIds: string[]; districtIds: string[]; verified?: boolean; name?: string },
) {
  const { login, bearer } = await import('./helpers');
  const session = await login(t, phone, 'MASTER');
  const res = await t.app.inject({
    method: 'PUT',
    url: '/master/profile',
    headers: bearer(session.accessToken),
    payload: {
      name: opts.name ?? 'Usta Akmal',
      categoryIds: opts.categoryIds,
      districtIds: opts.districtIds,
    },
  });
  if (res.statusCode !== 200) throw new Error(`profile failed: ${res.body}`);
  if (opts.verified ?? true) {
    await t.ctx.prisma.masterProfile.update({
      where: { userId: session.userId },
      data: { verificationStatus: 'VERIFIED' },
    });
  }
  return { ...session, auth: bearer(session.accessToken) };
}
