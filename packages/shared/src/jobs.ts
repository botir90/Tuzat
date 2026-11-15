import { z } from 'zod';
import { JOB_STATUSES, PRICE_CHANGE_STATUSES } from './enums';
import { offerDtoSchema } from './master';
import { requestDtoSchema } from './requests';

export const GUARANTEE_DAYS = 14;

/** Public info about a master shown on offers and jobs. */
export const masterCardSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  photoUrl: z.string().nullable(),
  ratingAvg: z.number(),
  ratingCount: z.number().int(),
  completedJobsCount: z.number().int(),
  verified: z.boolean(),
});
export type MasterCard = z.infer<typeof masterCardSchema>;

/** An offer as the customer sees it: price, time and who the master is. */
export const customerOfferDtoSchema = offerDtoSchema.extend({
  master: masterCardSchema,
});
export type CustomerOfferDto = z.infer<typeof customerOfferDtoSchema>;

export const priceChangeDtoSchema = z.object({
  id: z.string(),
  newPrice: z.number().int(),
  reason: z.string(),
  status: z.enum(PRICE_CHANGE_STATUSES),
  createdAt: z.string(),
});
export type PriceChangeDto = z.infer<typeof priceChangeDtoSchema>;

export const jobDtoSchema = z.object({
  id: z.string(),
  status: z.enum(JOB_STATUSES),
  /** Who is looking at the job. */
  myRole: z.enum(['CUSTOMER', 'MASTER']),
  agreedPrice: z.number().int(),
  /** The price to pay now (agreed price, or the last approved change). */
  currentPrice: z.number().int(),
  finalPrice: z.number().int().nullable(),
  arrivalAt: z.string(),
  onTheWayEtaMinutes: z.number().int().nullable(),
  acceptedAt: z.string(),
  onTheWayAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  doneAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  cancelledByMe: z.boolean(),
  guaranteeUntil: z.string().nullable(),
  /** Full request with the exact address (both sides may see it now). */
  request: requestDtoSchema,
  master: masterCardSchema.extend({ phone: z.string() }),
  customer: z.object({ name: z.string().nullable(), phone: z.string() }),
  pendingPriceChange: priceChangeDtoSchema.nullable(),
  priceChanges: z.array(priceChangeDtoSchema),
});
export type JobDto = z.infer<typeof jobDtoSchema>;

/** Status changes allowed through POST /jobs/:id/status. */
export const jobStatusBodySchema = z.object({
  status: z.enum(['ON_THE_WAY', 'IN_PROGRESS', 'DONE']),
  /** For ON_THE_WAY: "I'll be there in ~20 min". */
  etaMinutes: z.number().int().min(1).max(600).optional(),
});
export type JobStatusBody = z.infer<typeof jobStatusBodySchema>;

export const cancelJobSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const createPriceChangeSchema = z.object({
  newPrice: z.number().int().min(1000).max(100_000_000),
  reason: z.string().trim().min(3).max(300),
});
export type CreatePriceChangeBody = z.infer<typeof createPriceChangeSchema>;
