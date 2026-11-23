import { z } from 'zod';
import { localizedTextSchema } from './catalog';
import { OFFER_STATUSES, VERIFICATION_STATUSES } from './enums';
import { requestDtoSchema } from './requests';

export const MAX_OFFERS_PER_REQUEST = 5;
export const MAX_WORK_PHOTOS = 10;
export const MAX_OFFER_MESSAGE_LENGTH = 300;

// ---------- Profile ----------

export const masterProfileBodySchema = z.object({
  name: z.string().trim().min(2).max(100),
  photoKey: z.string().min(1).optional(),
  bio: z.string().trim().max(500).optional(),
  categoryIds: z.array(z.string().min(1)).min(1).max(10),
  districtIds: z.array(z.string().min(1)).min(1).max(30),
  workPhotoKeys: z.array(z.string().min(1)).max(MAX_WORK_PHOTOS).default([]),
});
export type MasterProfileBody = z.input<typeof masterProfileBodySchema>;

export const masterProfileDtoSchema = z.object({
  name: z.string().nullable(),
  photoUrl: z.string().nullable(),
  /** Storage key of the photo; send it back unchanged when editing. */
  photoKey: z.string().nullable(),
  bio: z.string().nullable(),
  verificationStatus: z.enum(VERIFICATION_STATUSES),
  rejectionReason: z.string().nullable(),
  isAvailable: z.boolean(),
  ratingAvg: z.number(),
  ratingCount: z.number().int(),
  completedJobsCount: z.number().int(),
  categories: z.array(z.object({ id: z.string(), name: localizedTextSchema })),
  districts: z.array(z.object({ id: z.string(), regionId: z.string(), name: localizedTextSchema })),
  workPhotos: z.array(z.object({ key: z.string(), url: z.string() })),
});
export type MasterProfileDto = z.infer<typeof masterProfileDtoSchema>;

export const availabilityBodySchema = z.object({ isAvailable: z.boolean() });

// ---------- Offers ----------

export const createOfferSchema = z.object({
  price: z.number().int().min(1000).max(100_000_000),
  arrivalAt: z.iso.datetime(),
  message: z.string().trim().max(MAX_OFFER_MESSAGE_LENGTH).optional(),
});
export type CreateOfferBody = z.infer<typeof createOfferSchema>;

export const offerDtoSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  price: z.number().int(),
  arrivalAt: z.string(),
  message: z.string().nullable(),
  status: z.enum(OFFER_STATUSES),
  createdAt: z.string(),
});
export type OfferDto = z.infer<typeof offerDtoSchema>;

/** A request as a master sees it in the feed (no exact address). */
export const feedItemDtoSchema = requestDtoSchema.extend({
  /** Typical price range of this category in this region (from the price list). */
  priceRange: z.object({ min: z.number().int(), max: z.number().int() }).nullable(),
  myOffer: offerDtoSchema.nullable(),
});
export type FeedItemDto = z.infer<typeof feedItemDtoSchema>;

// ---------- Push ----------

export const pushTokenBodySchema = z.object({
  token: z.string().min(10).max(300),
  platform: z.enum(['android', 'ios']),
});
export type PushTokenBody = z.infer<typeof pushTokenBodySchema>;

// ---------- Earnings (design/screens/MasterEarnings.html) ----------

export const masterEarningsDtoSchema = z.object({
  week: z.object({
    total: z.number().int(),
    jobs: z.number().int(),
    /** Monday … Sunday of the current week (Tashkent time), sum per day. */
    days: z.array(z.number().int()).length(7),
    /** 0 = Monday … 6 = Sunday. */
    todayIndex: z.number().int().min(0).max(6),
  }),
  month: z.object({ total: z.number().int(), jobs: z.number().int() }),
  ratingAvg: z.number(),
  ratingCount: z.number().int(),
  recent: z.array(
    z.object({
      jobId: z.string(),
      categoryName: localizedTextSchema,
      doneAt: z.string(),
      price: z.number().int(),
      stars: z.number().int().nullable(),
    }),
  ),
});
export type MasterEarningsDto = z.infer<typeof masterEarningsDtoSchema>;
