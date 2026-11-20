import { z } from 'zod';

/** Public info about a master shown on offers, jobs and the master's page. */
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

/** A master in the "Top masters" carousel on the customer home screen. */
export const topMasterSchema = masterCardSchema.extend({
  /** Main category (the first one the master chose). */
  categoryName: z.object({ 'uz-Latn': z.string(), 'uz-Cyrl': z.string(), ru: z.string() }),
});
export type TopMaster = z.infer<typeof topMasterSchema>;
