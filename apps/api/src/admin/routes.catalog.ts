import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  regionPriceSchema,
  updateRegionSchema,
  upsertCategorySchema,
  upsertPriceItemSchema,
} from '@usta/shared';
import type { AppContext } from '../context';
import { AppError, notFound } from '../lib/errors';
import { requireAdmin } from './auth';

const idParams = z.object({ id: z.string().min(1) });
const regionPriceParams = z.object({ id: z.string().min(1), regionId: z.string().min(1) });

/** Prisma error code for "unique constraint failed" (e.g. a slug that already exists). */
const isUniqueViolation = (error: unknown) => (error as { code?: string }).code === 'P2002';

async function withUniqueSlug<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError('CONFLICT', 409);
    throw error;
  }
}

/** Regions (launch on/off), categories, price items and per-region prices. */
export function registerAdminCatalogRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { prisma } = ctx;

  app.get('/admin/regions', async (request) => {
    await requireAdmin(ctx, request);
    const regions = await prisma.region.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { districts: true, waitlist: true } } },
    });
    return regions.map((r) => ({
      id: r.id,
      name: r.nameUzLatn,
      isActive: r.isActive,
      districtCount: r._count.districts,
      waitlistCount: r._count.waitlist,
    }));
  });

  /** "Open the region for customers" — do it after masters there are onboarded. */
  app.patch('/admin/regions/:id', async (request, reply) => {
    await requireAdmin(ctx, request);
    const { id } = idParams.parse(request.params);
    const { isActive } = updateRegionSchema.parse(request.body);
    const { count } = await prisma.region.updateMany({ where: { id }, data: { isActive } });
    if (count === 0) throw notFound();
    return reply.code(204).send();
  });

  app.get('/admin/categories', async (request) => {
    await requireAdmin(ctx, request);
    return prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        priceItems: {
          orderBy: { sortOrder: 'asc' },
          include: { regionOverrides: { include: { region: { select: { nameUzLatn: true } } } } },
        },
      },
    });
  });

  app.post('/admin/categories', async (request, reply) => {
    await requireAdmin(ctx, request);
    const data = upsertCategorySchema.parse(request.body);
    const category = await withUniqueSlug(() => prisma.category.create({ data }));
    return reply.code(201).send(category);
  });

  app.put('/admin/categories/:id', async (request) => {
    await requireAdmin(ctx, request);
    const { id } = idParams.parse(request.params);
    const data = upsertCategorySchema.parse(request.body);
    if (!(await prisma.category.findUnique({ where: { id } }))) throw notFound();
    return withUniqueSlug(() => prisma.category.update({ where: { id }, data }));
  });

  app.post('/admin/price-items', async (request, reply) => {
    await requireAdmin(ctx, request);
    const data = upsertPriceItemSchema.parse(request.body);
    if (!(await prisma.category.findUnique({ where: { id: data.categoryId } }))) throw notFound();
    const item = await withUniqueSlug(() => prisma.priceItem.create({ data }));
    return reply.code(201).send(item);
  });

  app.put('/admin/price-items/:id', async (request) => {
    await requireAdmin(ctx, request);
    const { id } = idParams.parse(request.params);
    const data = upsertPriceItemSchema.parse(request.body);
    if (!(await prisma.priceItem.findUnique({ where: { id } }))) throw notFound();
    return withUniqueSlug(() => prisma.priceItem.update({ where: { id }, data }));
  });

  app.delete('/admin/price-items/:id', async (request, reply) => {
    await requireAdmin(ctx, request);
    const { id } = idParams.parse(request.params);
    const { count } = await prisma.priceItem.deleteMany({ where: { id } });
    if (count === 0) throw notFound();
    return reply.code(204).send();
  });

  /** A different price range for one region (Tashkent prices differ from Khorezm). */
  app.put('/admin/price-items/:id/regions/:regionId', async (request) => {
    await requireAdmin(ctx, request);
    const { id, regionId } = regionPriceParams.parse(request.params);
    const { minPrice, maxPrice } = regionPriceSchema.parse(request.body);
    const [item, region] = await Promise.all([
      prisma.priceItem.findUnique({ where: { id } }),
      prisma.region.findUnique({ where: { id: regionId } }),
    ]);
    if (!item || !region) throw notFound();
    return prisma.regionPrice.upsert({
      where: { priceItemId_regionId: { priceItemId: id, regionId } },
      update: { minPrice, maxPrice },
      create: { priceItemId: id, regionId, minPrice, maxPrice },
    });
  });

  app.delete('/admin/price-items/:id/regions/:regionId', async (request, reply) => {
    await requireAdmin(ctx, request);
    const { id, regionId } = regionPriceParams.parse(request.params);
    await prisma.regionPrice.deleteMany({ where: { priceItemId: id, regionId } });
    return reply.code(204).send();
  });
}
