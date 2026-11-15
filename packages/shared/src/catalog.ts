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
});
export type DistrictDto = z.infer<typeof districtDtoSchema>;

export const categoryDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: localizedTextSchema,
  icon: z.string(),
});
export type CategoryDto = z.infer<typeof categoryDtoSchema>;

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
