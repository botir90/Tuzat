import { z } from 'zod';

/**
 * Turns what a user typed into the standard form "+998XXXXXXXXX".
 * Accepts spaces, dashes, brackets, with or without "+998" / "998".
 * Returns null when it is not a valid Uzbek phone number.
 */
export function normalizeUzPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('998') ? digits.slice(3) : digits;
  if (!/^\d{9}$/.test(local)) return null;
  return `+998${local}`;
}

/** Zod schema: validates a phone number and outputs it normalized. */
export const phoneSchema = z.string().transform((value, ctx) => {
  const phone = normalizeUzPhone(value);
  if (phone === null) {
    ctx.addIssue({ code: 'custom', message: 'INVALID_PHONE' });
    return z.NEVER;
  }
  return phone;
});

/** "+998901234567" → "+998 90 123 45 67" for display. */
export function formatUzPhone(phone: string): string {
  const m = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}
