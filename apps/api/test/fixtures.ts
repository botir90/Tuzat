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
