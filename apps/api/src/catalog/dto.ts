import type {
  CategoryDto,
  DistrictDto,
  LocalizedText,
  PriceItemDto,
  RegionDto,
} from '@usta/shared';
import type { Category, District, PriceItem, Region } from '../generated/prisma/client';

interface HasNames {
  nameUzLatn: string;
  nameUzCyrl: string;
  nameRu: string;
}

/** Database columns → { 'uz-Latn', 'uz-Cyrl', ru } object the app uses. */
export function names(row: HasNames): LocalizedText {
  return { 'uz-Latn': row.nameUzLatn, 'uz-Cyrl': row.nameUzCyrl, ru: row.nameRu };
}

export const toRegionDto = (r: Region): RegionDto => ({
  id: r.id,
  slug: r.slug,
  name: names(r),
  isActive: r.isActive,
});

export const toDistrictDto = (d: District): DistrictDto => ({
  id: d.id,
  slug: d.slug,
  regionId: d.regionId,
  type: d.type,
  name: names(d),
  lat: d.lat,
  lng: d.lng,
});

export const toCategoryDto = (c: Category): CategoryDto => ({
  id: c.id,
  slug: c.slug,
  name: names(c),
  icon: c.icon,
});

export const toPriceItemDto = (
  p: PriceItem,
  override?: { minPrice: number; maxPrice: number },
): PriceItemDto => ({
  id: p.id,
  slug: p.slug,
  name: names(p),
  minPrice: override?.minPrice ?? p.minPrice,
  maxPrice: override?.maxPrice ?? p.maxPrice,
});
