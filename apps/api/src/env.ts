import 'dotenv/config';
import { z } from 'zod';

// Validate environment variables once at startup, so a missing value
// fails fast with a clear message instead of a strange error later.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    console.error('Invalid environment variables:', z.prettifyError(result.error));
    process.exit(1);
  }
  return result.data;
}
