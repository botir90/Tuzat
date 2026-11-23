import type { PrismaClient } from './generated/prisma/client';
import { generateOtpCode } from './auth/crypto';
import { OtpService } from './auth/otp';
import { TokenService } from './auth/tokens';
import type { Env } from './env';
import type { SmsSender } from './sms/sms';
import type { FileStorage } from './storage/storage';
import type { PushSender } from './push/push';
import { BackgroundTasks } from './lib/background';
import { FakePaymentProvider, type PaymentProvider } from './payments/provider';

/** Everything the routes need. Built once at startup; tests build it with fakes. */
export interface AppContext {
  prisma: PrismaClient;
  env: Env;
  now: () => Date;
  otp: OtpService;
  tokens: TokenService;
  storage: FileStorage;
  push: PushSender;
  background: BackgroundTasks;
  payments: PaymentProvider;
}

export interface ContextDeps {
  prisma: PrismaClient;
  env: Env;
  sms: SmsSender;
  storage: FileStorage;
  push: PushSender;
  /** Default: the fake provider (no real money). */
  payments?: PaymentProvider;
  now?: () => Date;
  generateOtpCode?: () => string;
}

export function createContext(deps: ContextDeps): AppContext {
  const now = deps.now ?? (() => new Date());
  return {
    prisma: deps.prisma,
    env: deps.env,
    now,
    storage: deps.storage,
    push: deps.push,
    payments: deps.payments ?? new FakePaymentProvider(),
    background: new BackgroundTasks((error) => console.error('Background task failed', error)),
    otp: new OtpService({
      prisma: deps.prisma,
      sms: deps.sms,
      secret: deps.env.OTP_SECRET,
      now,
      generateCode: deps.generateOtpCode ?? generateOtpCode,
    }),
    tokens: new TokenService({
      prisma: deps.prisma,
      accessSecret: deps.env.JWT_ACCESS_SECRET,
      accessTtlSeconds: deps.env.ACCESS_TOKEN_TTL_SECONDS,
      refreshTtlDays: deps.env.REFRESH_TOKEN_TTL_DAYS,
      now,
    }),
  };
}
