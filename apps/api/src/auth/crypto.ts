import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';
import { OTP_LENGTH } from '@usta/shared';

/** A random numeric code like "048213" (crypto-secure). */
export function generateOtpCode(): string {
  return randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, '0');
}

/**
 * OTP codes are short, so a plain hash could be brute-forced from a leaked database.
 * HMAC with a server secret prevents that.
 */
export function hashOtp(secret: string, phone: string, code: string): string {
  return createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');
}

/** A long random token for refresh tokens (256 bits, URL-safe). */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Refresh tokens are long and random, so a plain SHA-256 is enough. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
