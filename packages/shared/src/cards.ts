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
