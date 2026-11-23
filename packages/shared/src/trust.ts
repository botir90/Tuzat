import { z } from 'zod';
import { localizedTextSchema } from './catalog';
import { masterCardSchema } from './cards';

export const MAX_REVIEW_PHOTOS = 3;
export const CLAIM_STATUSES = ['OPEN', 'RESOLVED', 'REJECTED'] as const;
export const COMPLAINT_STATUSES = ['OPEN', 'RESOLVED'] as const;

// ---------- Reviews ----------

export const createReviewSchema = z.object({
  stars: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
  photoKeys: z.array(z.string().min(1)).max(MAX_REVIEW_PHOTOS).default([]),
});
export type CreateReviewBody = z.input<typeof createReviewSchema>;

export const reviewDtoSchema = z.object({
  id: z.string(),
  stars: z.number().int(),
  comment: z.string().nullable(),
  photoUrls: z.array(z.string()),
  /** Short form for privacy, e.g. "Botir Q.". */
  customerName: z.string().nullable(),
  categoryName: localizedTextSchema,
  createdAt: z.string(),
});
export type ReviewDto = z.infer<typeof reviewDtoSchema>;

/** "Qodirberganov Botir" → "Qodirberganov B." (first word + initial of the second). */
export function shortName(name: string | null): string | null {
  if (!name) return null;
  const [first, second] = name.trim().split(/\s+/);
  if (!first) return null;
  return second ? `${first} ${second.charAt(0).toUpperCase()}.` : first;
}

/** A master's public page: who they are and every review (negative ones too). */
export const masterPublicDtoSchema = z.object({
  master: masterCardSchema,
  bio: z.string().nullable(),
  categories: z.array(z.object({ id: z.string(), name: localizedTextSchema })),
  /** Where the master works (district names). */
  districts: z.array(localizedTextSchema),
  /** Typical prices of the master's trades (price list, region prices where set), max 5. */
  prices: z.array(
    z.object({ id: z.string(), name: localizedTextSchema, minPrice: z.number().int() }),
  ),
  workPhotoUrls: z.array(z.string()),
  reviews: z.array(reviewDtoSchema),
});
export type MasterPublicDto = z.infer<typeof masterPublicDtoSchema>;

// ---------- Guarantee ----------

export const createGuaranteeClaimSchema = z.object({
  description: z.string().trim().min(5).max(1000),
});
export type CreateGuaranteeClaimBody = z.infer<typeof createGuaranteeClaimSchema>;

export const guaranteeClaimDtoSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: z.enum(CLAIM_STATUSES),
  adminNote: z.string().nullable(),
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
});
export type GuaranteeClaimDto = z.infer<typeof guaranteeClaimDtoSchema>;

// ---------- Complaints ----------

export const createComplaintSchema = z.object({
  text: z.string().trim().min(5).max(2000),
});
export type CreateComplaintBody = z.infer<typeof createComplaintSchema>;

export const complaintDtoSchema = z.object({
  id: z.string(),
  text: z.string(),
  status: z.enum(COMPLAINT_STATUSES),
  adminNote: z.string().nullable(),
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
});
export type ComplaintDto = z.infer<typeof complaintDtoSchema>;
