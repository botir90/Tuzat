/**
 * Fills the catalog: regions, districts, categories and prices.
 * Safe to run many times ("upsert" = update if it exists, create if not).
 * Run: pnpm --filter @usta/api db:seed
 */
import 'dotenv/config';
import { createPrismaClient } from '../src/db';
import type { PrismaClient } from '../src/generated/prisma/client';
import { CATEGORY_GROUPS, OTHER_CATEGORY, type CategorySeed } from './seed-data/categories';
import { REGIONS } from './seed-data/regions';

/** "Qo'shko'pir" → "qoshkopir", "Mirzo Ulug'bek" → "mirzo-ulugbek". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['ʻʼ‘’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function seedCatalog(prisma: PrismaClient): Promise<void> {
  for (const [regionIndex, region] of REGIONS.entries()) {
    const [nameUzLatn, nameUzCyrl, nameRu] = region.name;
    const saved = await prisma.region.upsert({
      where: { slug: region.slug },
      // isActive is NOT overwritten on update: admins change it later.
      update: { nameUzLatn, nameUzCyrl, nameRu, sortOrder: regionIndex },
      create: {
        slug: region.slug,
        nameUzLatn,
        nameUzCyrl,
        nameRu,
        isActive: region.isActive,
        sortOrder: regionIndex,
      },
    });

    // Cities first (people usually live there), then districts, each alphabetically.
    const entries = [
      ...region.cities.map(([latn, cyrl, ru, lat, lng]) => ({
        type: 'CITY' as const,
        slug: `${region.slug}-${slugify(latn)}-shahri`,
        nameUzLatn: `${latn} shahri`,
        nameUzCyrl: `${cyrl} шаҳри`,
        nameRu: ru,
        lat,
        lng,
      })),
      ...region.districts.map(([latn, cyrl, ru]) => ({
        type: 'DISTRICT' as const,
        slug: `${region.slug}-${slugify(latn)}-tumani`,
        nameUzLatn: `${latn} tumani`,
        nameUzCyrl: `${cyrl} тумани`,
        nameRu: ru,
        lat: null,
        lng: null,
      })),
    ];

    for (const [index, entry] of entries.entries()) {
      const data = { ...entry, regionId: saved.id, sortOrder: index };
      await prisma.district.upsert({ where: { slug: entry.slug }, update: data, create: data });
    }
  }

  // Groups and their trades, in the order of design/screens/Categories.html.
  // sortOrder is global, so the home screen can show the first N trades in a stable order.
  let order = 0;
  for (const [groupIndex, group] of CATEGORY_GROUPS.entries()) {
    const [nameUzLatn, nameUzCyrl, nameRu] = group.name;
    const groupData = { slug: group.slug, nameUzLatn, nameUzCyrl, nameRu, sortOrder: groupIndex };
    const savedGroup = await prisma.categoryGroup.upsert({
      where: { slug: group.slug },
      update: groupData,
      create: groupData,
    });
    for (const category of group.categories) {
      await seedCategory(prisma, category, savedGroup.id, order++);
    }
  }
  // "Other / can't find a master" is always last and in no group.
  await seedCategory(prisma, OTHER_CATEGORY, null, 1000);
}

/** Creates or updates one category and its price items. isActive is never overwritten. */
async function seedCategory(
  prisma: PrismaClient,
  category: CategorySeed,
  groupId: string | null,
  sortOrder: number,
): Promise<void> {
  const [nameUzLatn, nameUzCyrl, nameRu] = category.name;
  const data = {
    slug: category.slug,
    nameUzLatn,
    nameUzCyrl,
    nameRu,
    icon: category.icon,
    color: category.color,
    groupId,
    sortOrder,
  };
  const saved = await prisma.category.upsert({
    where: { slug: category.slug },
    update: data,
    create: data,
  });

  for (const [index, price] of category.prices.entries()) {
    const [pLatn, pCyrl, pRu] = price.name;
    const priceData = {
      slug: price.slug,
      categoryId: saved.id,
      nameUzLatn: pLatn,
      nameUzCyrl: pCyrl,
      nameRu: pRu,
      minPrice: price.min,
      maxPrice: price.max,
      sortOrder: index,
    };
    await prisma.priceItem.upsert({
      where: { slug: price.slug },
      update: priceData,
      create: priceData,
    });
  }
}

// Run directly (not when imported by tests).
if (process.argv[1]?.replace(/\\/g, '/').endsWith('prisma/seed.ts')) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const prisma = createPrismaClient(url);
  seedCatalog(prisma)
    .then(async () => {
      const [regions, districts, categories, prices] = await Promise.all([
        prisma.region.count(),
        prisma.district.count(),
        prisma.category.count(),
        prisma.priceItem.count(),
      ]);
      console.log(
        `Seeded: ${regions} regions, ${districts} districts/cities, ${categories} categories, ${prices} prices`,
      );
    })
    .finally(() => prisma.$disconnect());
}
