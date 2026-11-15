import type { OtpRequestResponse } from '@usta/shared';
import type { PrismaClient } from '../generated/prisma/client';
import { AppError } from '../lib/errors';
import type { SmsSender } from '../sms/sms';
import { hashOtp } from './crypto';

export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_RESEND_AFTER_SECONDS = 60;
export const OTP_MAX_PER_HOUR = 5;
export const OTP_MAX_ATTEMPTS = 5;

export interface OtpServiceOptions {
  prisma: PrismaClient;
  sms: SmsSender;
  secret: string;
  now: () => Date;
  generateCode: () => string;
}

export class OtpService {
  constructor(private readonly opts: OtpServiceOptions) {}

  /** Creates a code and sends it by SMS. Limits: 1 per minute, 5 per hour per phone. */
  async request(phone: string): Promise<OtpRequestResponse> {
    const { prisma, now } = this.opts;
    const current = now();

    const last = await prisma.otpCode.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });
    if (last) {
      const secondsSince = (current.getTime() - last.createdAt.getTime()) / 1000;
      if (secondsSince < OTP_RESEND_AFTER_SECONDS) {
        throw new AppError('OTP_TOO_SOON', 429, {
          retryAfterSeconds: Math.ceil(OTP_RESEND_AFTER_SECONDS - secondsSince),
        });
      }
    }

    const sentLastHour = await prisma.otpCode.count({
      where: { phone, createdAt: { gt: new Date(current.getTime() - 3_600_000) } },
    });
    if (sentLastHour >= OTP_MAX_PER_HOUR) throw new AppError('OTP_TOO_MANY_REQUESTS', 429);

    const code = this.opts.generateCode();
    await prisma.otpCode.create({
      data: {
        phone,
        codeHash: hashOtp(this.opts.secret, phone, code),
        expiresAt: new Date(current.getTime() + OTP_TTL_SECONDS * 1000),
        createdAt: current,
      },
    });
    await this.opts.sms.send(phone, `Tasdiqlash kodi: ${code}`);

    return { expiresInSeconds: OTP_TTL_SECONDS, resendAfterSeconds: OTP_RESEND_AFTER_SECONDS };
  }

  /** Checks the latest code for this phone. Throws a clear error code when it doesn't match. */
  async verify(phone: string, code: string): Promise<void> {
    const { prisma, now } = this.opts;
    const otp = await prisma.otpCode.findFirst({
      where: { phone, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) throw new AppError('OTP_INVALID', 400);
    if (otp.expiresAt <= now()) throw new AppError('OTP_EXPIRED', 400);
    if (otp.attempts >= OTP_MAX_ATTEMPTS) throw new AppError('OTP_TOO_MANY_ATTEMPTS', 400);

    if (otp.codeHash !== hashOtp(this.opts.secret, phone, code)) {
      await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new AppError('OTP_INVALID', 400);
    }

    // consumedAt: null in the filter makes sure a code is used only once, even under a race.
    const { count } = await prisma.otpCode.updateMany({
      where: { id: otp.id, consumedAt: null },
      data: { consumedAt: now() },
    });
    if (count === 0) throw new AppError('OTP_INVALID', 400);
  }
}
