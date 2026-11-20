import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type CategoryColor,
  type CategoryIcon,
  type CategoryDto,
  type DistrictDto,
  type LocalizedText,
  type PriceItemDto,
  type RegionDto,
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

/** Unknown values (e.g. an icon removed from the app) fall back to safe defaults. */
const asIcon = (value: string): CategoryIcon =>
  (CATEGORY_ICONS as readonly string[]).includes(value) ? (value as CategoryIcon) : 'circle-help';
const asColor = (value: string): CategoryColor =>
  (CATEGORY_COLORS as readonly string[]).includes(value) ? (value as CategoryColor) : 'gray';

export const toCategoryDto = (c: Category): CategoryDto => ({
  id: c.id,
  slug: c.slug,
  name: names(c),
  icon: asIcon(c.icon),
  color: asColor(c.color),
  groupId: c.groupId,
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
