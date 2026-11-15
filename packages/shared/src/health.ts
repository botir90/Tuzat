import { z } from 'zod';

/** Response of GET /health. Validated with Zod on both sides. */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  database: z.enum(['up', 'down']),
  time: z.string(),
});

/** z.infer turns a Zod schema into a normal TypeScript type. */
export type HealthResponse = z.infer<typeof healthResponseSchema>;
