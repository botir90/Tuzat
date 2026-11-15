import type { PrismaClient } from './generated/prisma/client';
import { generateOtpCode } from './auth/crypto';
import { OtpService } from './auth/otp';
import { TokenService } from './auth/tokens';
import type { Env } from './env';
import type { SmsSender } from './sms/sms';
import type { FileStorage } from './storage/storage';

/** Everything the routes need. Built once at startup; tests build it with fakes. */
export interface AppContext {
  prisma: PrismaClient;
  env: Env;
  now: () => Date;
  otp: OtpService;
  tokens: TokenService;
  storage: FileStorage;
}

export interface ContextDeps {
  prisma: PrismaClient;
  env: Env;
  sms: SmsSender;
  storage: FileStorage;
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
