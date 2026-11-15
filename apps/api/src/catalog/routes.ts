import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  waitlistBodySchema,
  type AvailabilityDto,
  type CategoryDto,
  type DistrictDto,
  type PriceItemDto,
  type RegionDto,
} from '@usta/shared';
import type { AppContext } from '../context';
import { notFound } from '../lib/errors';
import { toCategoryDto, toDistrictDto, toPriceItemDto, toRegionDto } from './dto';

const idParams = z.object({ id: z.string().min(1) });
const pricesQuery = z.object({ regionId: z.string().min(1).optional() });
const availabilityQuery = z.object({
  districtId: z.string().min(1),
  categoryId: z.string().min(1).optional(),
});

/** Same request from the same phone within this time is ignored (no duplicates). */
const WAITLIST_DEDUPE_MS = 30 * 86_400_000;

/** Public catalog: no login needed (customers browse without an account). */
export function registerCatalogRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { prisma } = ctx;

  app.get('/regions', async (): Promise<RegionDto[]> => {
    const regions = await prisma.region.findMany({ orderBy: { sortOrder: 'asc' } });
    return regions.map(toRegionDto);
  });

  app.get('/regions/:id/districts', async (request): Promise<DistrictDto[]> => {
    const { id } = idParams.parse(request.params);
    const region = await prisma.region.findUnique({ where: { id } });
    if (!region) throw notFound();
    const districts = await prisma.district.findMany({
      where: { regionId: id },
      orderBy: { sortOrder: 'asc' },
    });
    return districts.map(toDistrictDto);
  });

  app.get('/categories', async (): Promise<CategoryDto[]> => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return categories.map(toCategoryDto);
  });

  /** Price list of a category. With ?regionId= the region's own prices are used where set. */
  app.get('/categories/:id/prices', async (request): Promise<PriceItemDto[]> => {
    const { id } = idParams.parse(request.params);
    const { regionId } = pricesQuery.parse(request.query);
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category || !category.isActive) throw notFound();

    const items = await prisma.priceItem.findMany({
      where: { categoryId: id },
      orderBy: { sortOrder: 'asc' },
      // Without a regionId no override can match ('' is never an id).
      include: { regionOverrides: { where: { regionId: regionId ?? '' } } },
    });
    return items.map((item) => toPriceItemDto(item, item.regionOverrides[0]));
  });

  /**
   * Can a customer in this district get a master?
   * The region must be launched AND a verified master must serve this district (and category).
   */
  app.get('/availability', async (request): Promise<AvailabilityDto> => {
    const { districtId, categoryId } = availabilityQuery.parse(request.query);
    const district = await prisma.district.findUnique({
      where: { id: districtId },
      include: { region: true },
    });
    if (!district) throw notFound();
    if (!district.region.isActive) return { available: false };
    // At least one verified master works in this district (and category).
    const masters = await prisma.masterProfile.count({
      where: {
        verificationStatus: 'VERIFIED',
        districts: { some: { id: districtId } },
        ...(categoryId ? { categories: { some: { id: categoryId } } } : {}),
      },
    });
    return { available: masters > 0 };
  });

  /** "No masters here yet, leave your number and we'll notify you." */
  app.post('/waitlist', async (request, reply) => {
    const body = waitlistBodySchema.parse(request.body);

    const region = await prisma.region.findUnique({ where: { id: body.regionId } });
    if (!region) throw notFound();
    if (body.districtId) {
      const district = await prisma.district.findUnique({ where: { id: body.districtId } });
      if (!district || district.regionId !== region.id) throw notFound();
    }
    if (body.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
      if (!category) throw notFound();
    }

    const duplicate = await prisma.waitlistEntry.findFirst({
      where: {
        phone: body.phone,
        regionId: body.regionId,
        districtId: body.districtId ?? null,
        categoryId: body.categoryId ?? null,
        createdAt: { gt: new Date(ctx.now().getTime() - WAITLIST_DEDUPE_MS) },
      },
    });
    if (!duplicate) {
      await prisma.waitlistEntry.create({
        data: {
          phone: body.phone,
          regionId: body.regionId,
          districtId: body.districtId,
          categoryId: body.categoryId,
          createdAt: ctx.now(),
        },
      });
    }
    return reply.code(201).send({ ok: true });
  });
}
