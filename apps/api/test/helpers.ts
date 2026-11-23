import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach } from 'vitest';
import { buildApp, type BuildAppOptions } from '../src/app';
import { createContext, type AppContext } from '../src/context';
import { createPrismaClient } from '../src/db';
import { parseEnv } from '../src/env';
import type { SmsSender } from '../src/sms/sms';
import type { FileStorage } from '../src/storage/storage';
import type { PushMessage, PushSender } from '../src/push/push';
import { testDatabaseUrl } from './test-env';

/** Remembers SMS messages instead of sending them, so tests can read the code. */
export class FakeSms implements SmsSender {
  messages: { phone: string; text: string }[] = [];
  async send(phone: string, text: string): Promise<void> {
    this.messages.push({ phone, text });
  }
}

/** Remembers push notifications so tests can check them. */
export class FakePush implements PushSender {
  sent: PushMessage[] = [];
  async send(messages: PushMessage[]): Promise<void> {
    this.sent.push(...messages);
  }
}

/** In-memory file storage. Tests "upload" with storage.put(key, size). */
export class FakeStorage implements FileStorage {
  files = new Map<string, { size: number; contentType: string }>();
  put(key: string, size = 1000, contentType = 'image/jpeg'): void {
    this.files.set(key, { size, contentType });
  }
  async presignUpload(
    key: string,
    _contentType: string,
    endpoint = 'http://storage',
  ): Promise<string> {
    return `${endpoint}/upload/${key}`;
  }
  async presignDownload(key: string, endpoint = 'http://storage'): Promise<string> {
    return `${endpoint}/download/${key}`;
  }
  async head(key: string) {
    return this.files.get(key) ?? null;
  }
}

/** A clock that tests can move forward: clock.advance(60_000). */
export class FakeClock {
  constructor(private current = new Date('2026-01-01T09:00:00Z')) {}
  now = () => new Date(this.current);
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export const TEST_OTP_CODE = '123456';

export interface TestApp {
  app: FastifyInstance;
  ctx: AppContext;
  sms: FakeSms;
  clock: FakeClock;
  storage: FakeStorage;
  push: FakePush;
}

const prisma = createPrismaClient(testDatabaseUrl());

/** Every table except Prisma's own migrations table. */
async function truncateAll(): Promise<void> {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (rows.length === 0) return;
  const list = rows.map((r) => `"${r.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

/**
 * Call at the top of a test file. Gives a fresh app and an empty database before each test.
 */
export function useTestApp(options: BuildAppOptions = {}): TestApp {
  const holder = {} as TestApp;

  beforeEach(async () => {
    await truncateAll();
    const sms = new FakeSms();
    const storage = new FakeStorage();
    const push = new FakePush();
    const clock = new FakeClock();
    const env = parseEnv({
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl(),
      JWT_ACCESS_SECRET: 'test-access-secret-that-is-long-enough-123',
      OTP_SECRET: 'test-otp-secret-that-is-long-enough-123456',
      ADMIN_JWT_SECRET: 'test-admin-secret-that-is-long-enough-1234',
      S3_ENDPOINT: 'http://localhost:8333',
      S3_PUBLIC_ENDPOINT: 'http://storage.test',
      S3_BUCKET: 'test',
      S3_ACCESS_KEY: 'test',
      S3_SECRET_KEY: 'test',
      // Tokens are signed offline; nothing is sent to LiveKit in tests.
      LIVEKIT_URL: 'wss://test.livekit.cloud',
      LIVEKIT_API_KEY: 'APItestkey',
      LIVEKIT_API_SECRET: 'test-livekit-secret-that-is-long-enough-12345',
    });
    const ctx = createContext({
      prisma,
      env,
      sms,
      storage,
      push,
      now: clock.now,
      generateOtpCode: () => TEST_OTP_CODE,
    });
    Object.assign(holder, { app: buildApp(ctx, options), ctx, sms, clock, storage, push });
  });

  // Background work (push notifications) must finish before the next test wipes the tables.
  afterEach(async () => {
    await holder.ctx?.background.drain();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  return holder;
}

/** Logs a phone number in through the real OTP flow and returns the tokens. */
export async function login(
  t: TestApp,
  phone = '+998901234567',
  role?: 'CUSTOMER' | 'MASTER',
): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
  await t.app.inject({ method: 'POST', url: '/auth/otp/request', payload: { phone } });
  const res = await t.app.inject({
    method: 'POST',
    url: '/auth/otp/verify',
    payload: { phone, code: TEST_OTP_CODE, role },
  });
  if (res.statusCode !== 200) throw new Error(`login failed: ${res.body}`);
  const body = res.json();
  return { accessToken: body.accessToken, refreshToken: body.refreshToken, userId: body.user.id };
}

export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
