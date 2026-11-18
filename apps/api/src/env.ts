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
  /** Separate secret for admin panel tokens. Long random string. */
  ADMIN_JWT_SECRET: z.string().min(32),
  /** Address of the admin panel (allowed by CORS). */
  ADMIN_ORIGIN: z.string().default('http://localhost:5173'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  /** "console" prints OTP codes to the terminal (development). */
  SMS_PROVIDER: z.enum(['console']).default('console'),
  /** 'expo' sends real push notifications, 'log' prints them in the terminal. */
  PUSH_PROVIDER: z.enum(['expo', 'log']).default('expo'),

  /** S3-compatible file storage (SeaweedFS in docker-compose for development). */
  S3_ENDPOINT: z.url(),
  /** Address phones use to reach storage. Optional in development (derived from the request). */
  S3_PUBLIC_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
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
