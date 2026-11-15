import 'dotenv/config';
import { z } from 'zod';

// Validate environment variables once at startup, so a missing value
// fails fast with a clear message instead of a strange error later.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),

  /** Secret for signing access tokens (JWT). Long random string. */
  JWT_ACCESS_SECRET: z.string().min(32),
  /** Secret mixed into OTP code hashes. Long random string. */
  OTP_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  /** "console" prints OTP codes to the terminal (development). */
  SMS_PROVIDER: z.enum(['console']).default('console'),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  return envSchema.parse(source);
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    console.error('Invalid environment variables:', z.prettifyError(result.error));
    process.exit(1);
  }
  return result.data;
}
