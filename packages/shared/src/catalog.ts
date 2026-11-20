import { z } from 'zod';
import { phoneSchema } from './phone';

/** A text in all three app languages. */
export const localizedTextSchema = z.object({
  'uz-Latn': z.string(),
  'uz-Cyrl': z.string(),
  ru: z.string(),
});

export const regionDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: localizedTextSchema,
  /** false = we have not launched there yet ("no masters here yet" screen). */
  isActive: z.boolean(),
});
export type RegionDto = z.infer<typeof regionDtoSchema>;

export const DISTRICT_TYPES = ['DISTRICT', 'CITY'] as const;

export const districtDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  regionId: z.string(),
  type: z.enum(DISTRICT_TYPES),
  name: localizedTextSchema,
  /** Approximate center; null when unknown. */
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});
export type DistrictDto = z.infer<typeof districtDtoSchema>;

/**
 * Icons a category may use (lucide icon names, kebab-case). The admin picks one from this
 * list, so a new trade can be added without changing the app. To allow a new icon, add it
 * here AND to apps/mobile/src/components/CategoryIcon.tsx.
 */
export const CATEGORY_ICONS = [
  'droplet',
  'zap',
  'snowflake',
  'flame',
  'sparkles',
  'hammer',
  'lock',
  'thermometer',
  'paintbrush',
  'panel-top',
  'square',
  'grid-2x2',
  'brush',
  'scroll',
  'rows-3',
  'app-window',
  'door-open',
  'house',
  'brick-wall',
  'key-round',
  'washing-machine',
  'refrigerator',
  'tv',
  'laptop',
  'cooking-pot',
  'microwave',
  'cctv',
  'wifi',
  'sofa',
  'armchair',
  'utensils',
  'spray-can',
  'waves',
  'truck',
  'sprout',
  'bug',
  'circle-help',
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

/** Tile colors from design/theme.ts (background + icon color pairs). */
export const CATEGORY_COLORS = [
  'blue',
  'gold',
  'cyan',
  'violet',
  'teal',
  'orange',
  'pink',
  'gray',
] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export const categoryDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: localizedTextSchema,
  icon: z.enum(CATEGORY_ICONS),
  color: z.enum(CATEGORY_COLORS),
  /** null = not in a group yet (shown at the end). */
  groupId: z.string().nullable(),
});
export type CategoryDto = z.infer<typeof categoryDtoSchema>;

/** A group of trades on the "All services" screen, e.g. "Repair". */
export const categoryGroupDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: localizedTextSchema,
  categories: z.array(categoryDtoSchema),
});
export type CategoryGroupDto = z.infer<typeof categoryGroupDtoSchema>;

/** The catch-all "Other / can't find a master" category. Always last, never in a group. */
export const OTHER_CATEGORY_SLUG = 'other';

export const priceItemDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: localizedTextSchema,
  minPrice: z.number().int(),
  maxPrice: z.number().int(),
});
export type PriceItemDto = z.infer<typeof priceItemDtoSchema>;

export const availabilityDtoSchema = z.object({
  available: z.boolean(),
});
export type AvailabilityDto = z.infer<typeof availabilityDtoSchema>;

export const waitlistBodySchema = z.object({
  phone: phoneSchema,
  regionId: z.string().min(1),
  districtId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
});
export type WaitlistBody = z.input<typeof waitlistBodySchema>;

/** 150000 → "150 000" (Uzbek style: space as thousands separator). */
export function formatSum(amount: number): string {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** "Popular services" on the home screen: one typical job per category, with its price. */
export const popularServiceSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: localizedTextSchema,
  /** The lowest price of the range ("from X so'm"), with the region's own price if set. */
  minPrice: z.number().int(),
});
export type PopularService = z.infer<typeof popularServiceSchema>;
