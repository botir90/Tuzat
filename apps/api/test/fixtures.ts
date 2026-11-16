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

/**
 * Full happy path up to a finished job: customer request → master offer → accepted →
 * IN_PROGRESS → DONE (unless `finish: false`). Used by review / guarantee / complaint tests.
 */
export async function createJob(t: import('./helpers').TestApp, opts: { finish?: boolean } = {}) {
  const { login, bearer } = await import('./helpers');
  const c = await createCatalog(t.ctx.prisma);
  const customer = await login(t, '+998901112233', 'CUSTOMER');
  const customerAuth = bearer(customer.accessToken);
  const master = await createMaster(t, '+998905556677', {
    categoryIds: [c.plumber.id],
    districtIds: [c.urganch.id],
    name: 'Akmal Karimov',
  });

  const inject = async (method: 'GET' | 'POST', url: string, headers: object, payload?: object) => {
    const res = await t.app.inject({
      method,
      url,
      headers: headers as Record<string, string>,
      payload,
    });
    if (res.statusCode >= 400) throw new Error(`${method} ${url} failed: ${res.body}`);
    return res.json();
  };

  const request = await inject('POST', '/requests', customerAuth, {
    categoryId: c.plumber.id,
    districtId: c.urganch.id,
    description: 'Kran oqyapti',
    address: 'Al-Xorazmiy 12',
    desiredTime: 'NOW',
  });
  const offer = await inject('POST', `/master/requests/${request.id}/offers`, master.auth, {
    price: 120_000,
    arrivalAt: '2026-01-01T10:00:00.000Z',
  });
  const job = await inject(
    'POST',
    `/requests/${request.id}/offers/${offer.id}/accept`,
    customerAuth,
  );
  if (opts.finish ?? true) {
    await inject('POST', `/jobs/${job.id}/status`, master.auth, { status: 'IN_PROGRESS' });
    await inject('POST', `/jobs/${job.id}/status`, master.auth, { status: 'DONE' });
  }
  return { catalog: c, customer, customerAuth, master, jobId: job.id as string };
}
