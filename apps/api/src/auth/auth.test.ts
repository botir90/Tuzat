import { describe, expect, it } from 'vitest';
import { authResponseSchema } from '@usta/shared';
import { TEST_OTP_CODE, bearer, login, useTestApp } from '../../test/helpers';
import { OTP_MAX_ATTEMPTS, OTP_RESEND_AFTER_SECONDS, OTP_TTL_SECONDS } from './otp';

const PHONE = '+998901234567';

describe('auth', () => {
  const t = useTestApp();

  const requestOtp = (phone: string = PHONE) =>
    t.app.inject({ method: 'POST', url: '/auth/otp/request', payload: { phone } });
  const verifyOtp = (payload: Record<string, unknown>) =>
    t.app.inject({ method: 'POST', url: '/auth/otp/verify', payload });

  describe('POST /auth/otp/request', () => {
    it('sends a code by SMS to the normalized phone', async () => {
      const res = await requestOtp('90 123 45 67');

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        expiresInSeconds: OTP_TTL_SECONDS,
        resendAfterSeconds: OTP_RESEND_AFTER_SECONDS,
      });
      expect(t.sms.messages).toEqual([{ phone: PHONE, text: expect.stringContaining('123456') }]);
    });

    it('rejects an invalid phone number', async () => {
      const res = await requestOtp('12345');
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: { code: 'VALIDATION_ERROR' } });
    });

    it('does not allow a second code within a minute', async () => {
      await requestOtp();
      t.clock.advance(10_000);
      const res = await requestOtp();

      expect(res.statusCode).toBe(429);
      expect(res.json()).toEqual({ error: { code: 'OTP_TOO_SOON', retryAfterSeconds: 50 } });
    });

    it('allows at most 5 codes per hour', async () => {
      for (let i = 0; i < 5; i++) {
        expect((await requestOtp()).statusCode).toBe(200);
        t.clock.advance(OTP_RESEND_AFTER_SECONDS * 1000);
      }
      const res = await requestOtp();
      expect(res.json()).toEqual({ error: { code: 'OTP_TOO_MANY_REQUESTS' } });
    });
  });

  describe('POST /auth/otp/verify', () => {
    it('creates a user and returns tokens', async () => {
      await requestOtp();
      const res = await verifyOtp({
        phone: PHONE,
        code: TEST_OTP_CODE,
        role: 'MASTER',
        language: 'uz-Cyrl',
      });

      expect(res.statusCode).toBe(200);
      const body = authResponseSchema.parse(res.json());
      expect(body.user).toMatchObject({ phone: PHONE, role: 'MASTER', language: 'uz-Cyrl' });
    });

    it('keeps the existing role on the next login', async () => {
      await login(t, PHONE, 'MASTER');
      t.clock.advance(OTP_RESEND_AFTER_SECONDS * 1000);
      await requestOtp();
      const res = await verifyOtp({ phone: PHONE, code: TEST_OTP_CODE, role: 'CUSTOMER' });

      expect(res.json().user.role).toBe('MASTER');
    });

    it('rejects a wrong code', async () => {
      await requestOtp();
      const res = await verifyOtp({ phone: PHONE, code: '000000' });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: { code: 'OTP_INVALID' } });
    });

    it('rejects an expired code', async () => {
      await requestOtp();
      t.clock.advance((OTP_TTL_SECONDS + 1) * 1000);
      const res = await verifyOtp({ phone: PHONE, code: TEST_OTP_CODE });
      expect(res.json()).toEqual({ error: { code: 'OTP_EXPIRED' } });
    });

    it('locks the code after too many wrong attempts', async () => {
      await requestOtp();
      for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
        await verifyOtp({ phone: PHONE, code: '000000' });
      }
      const res = await verifyOtp({ phone: PHONE, code: TEST_OTP_CODE });
      expect(res.json()).toEqual({ error: { code: 'OTP_TOO_MANY_ATTEMPTS' } });
    });

    it('does not accept the same code twice', async () => {
      await login(t);
      const res = await verifyOtp({ phone: PHONE, code: TEST_OTP_CODE });
      expect(res.json()).toEqual({ error: { code: 'OTP_INVALID' } });
    });

    it('rejects a blocked user', async () => {
      const { userId } = await login(t);
      await t.ctx.prisma.user.update({ where: { id: userId }, data: { isBlocked: true } });
      t.clock.advance(OTP_RESEND_AFTER_SECONDS * 1000);
      await requestOtp();
      const res = await verifyOtp({ phone: PHONE, code: TEST_OTP_CODE });
      expect(res.statusCode).toBe(403);
      expect(res.json()).toEqual({ error: { code: 'USER_BLOCKED' } });
    });

    it('rejects a malformed code', async () => {
      const res = await verifyOtp({ phone: PHONE, code: '12' });
      expect(res.json()).toEqual({ error: { code: 'VALIDATION_ERROR' } });
    });
  });

  describe('POST /auth/refresh', () => {
    const refresh = (refreshToken: string) =>
      t.app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken } });

    it('returns a new token pair and invalidates the old refresh token', async () => {
      const { refreshToken } = await login(t);
      const res = await refresh(refreshToken);

      expect(res.statusCode).toBe(200);
      expect(res.json().refreshToken).not.toBe(refreshToken);
      expect((await refresh(res.json().refreshToken)).statusCode).toBe(200);
    });

    it('logs out everywhere when an old refresh token is reused', async () => {
      const { refreshToken } = await login(t);
      const second = (await refresh(refreshToken)).json().refreshToken;

      expect((await refresh(refreshToken)).statusCode).toBe(401);
      // The legitimate newer token was revoked too, as a safety measure.
      expect((await refresh(second)).statusCode).toBe(401);
    });

    it('rejects an expired refresh token', async () => {
      const { refreshToken } = await login(t);
      t.clock.advance(31 * 86_400_000);
      expect((await refresh(refreshToken)).statusCode).toBe(401);
    });

    it('rejects an unknown token', async () => {
      const res = await refresh('not-a-real-token');
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ error: { code: 'UNAUTHORIZED' } });
    });

    it('rejects an empty body', async () => {
      const res = await t.app.inject({ method: 'POST', url: '/auth/refresh', payload: {} });
      expect(res.json()).toEqual({ error: { code: 'VALIDATION_ERROR' } });
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the refresh token', async () => {
      const { refreshToken } = await login(t);
      const res = await t.app.inject({
        method: 'POST',
        url: '/auth/logout',
        payload: { refreshToken },
      });

      expect(res.statusCode).toBe(204);
      const after = await t.app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: { refreshToken },
      });
      expect(after.statusCode).toBe(401);
    });

    it('rejects a missing token', async () => {
      const res = await t.app.inject({ method: 'POST', url: '/auth/logout', payload: {} });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('access token', () => {
    it('expires after 15 minutes', async () => {
      const { accessToken } = await login(t);
      t.clock.advance(16 * 60 * 1000);
      const res = await t.app.inject({ method: 'GET', url: '/me', headers: bearer(accessToken) });
      expect(res.statusCode).toBe(401);
    });
  });
});
