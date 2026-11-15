import { describe, expect, it } from 'vitest';
import { otpVerifySchema } from './auth';
import { formatUzPhone, normalizeUzPhone, phoneSchema } from './phone';

describe('normalizeUzPhone', () => {
  it.each([
    ['+998901234567', '+998901234567'],
    ['998901234567', '+998901234567'],
    ['901234567', '+998901234567'],
    ['+998 (90) 123-45-67', '+998901234567'],
    ['90 123 45 67', '+998901234567'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeUzPhone(input)).toBe(expected);
  });

  it.each(['', '12345', '+7 900 123 45 67', '99890123456', '+9989012345678', 'abc'])(
    'rejects %s',
    (input) => {
      expect(normalizeUzPhone(input)).toBeNull();
    },
  );
});

describe('phoneSchema', () => {
  it('outputs the normalized phone', () => {
    expect(phoneSchema.parse('90 123 45 67')).toBe('+998901234567');
  });

  it('fails with INVALID_PHONE', () => {
    const result = phoneSchema.safeParse('123');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('INVALID_PHONE');
  });
});

describe('formatUzPhone', () => {
  it('adds spaces for display', () => {
    expect(formatUzPhone('+998901234567')).toBe('+998 90 123 45 67');
  });
});

describe('otpVerifySchema', () => {
  it('accepts a 6-digit code', () => {
    expect(otpVerifySchema.safeParse({ phone: '901234567', code: '123456' }).success).toBe(true);
  });

  it.each(['12345', '1234567', '12a456'])('rejects code %s', (code) => {
    expect(otpVerifySchema.safeParse({ phone: '901234567', code }).success).toBe(false);
  });

  it('does not allow choosing ADMIN', () => {
    const result = otpVerifySchema.safeParse({ phone: '901234567', code: '123456', role: 'ADMIN' });
    expect(result.success).toBe(false);
  });
});
