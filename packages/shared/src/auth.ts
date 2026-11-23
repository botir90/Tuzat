import { z } from 'zod';
import { USER_ROLES } from './enums';
import { LANGUAGES } from './i18n';
import { phoneSchema } from './phone';

export const OTP_LENGTH = 6;

/** Roles a user can pick in the app. ADMIN is never self-assigned. */
export const SELECTABLE_ROLES = ['CUSTOMER', 'MASTER'] as const;
export type SelectableRole = (typeof SELECTABLE_ROLES)[number];

// ---------- Requests ----------

export const otpRequestSchema = z.object({
  phone: phoneSchema,
});
/** z.input = what the client sends (before transform); z.output = what the server gets. */
export type OtpRequestBody = z.input<typeof otpRequestSchema>;

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), 'INVALID_CODE_FORMAT'),
  /** Mode chosen in the app before login; applied when the user has no role yet. */
  role: z.enum(SELECTABLE_ROLES).optional(),
  language: z.enum(LANGUAGES).optional(),
});
export type OtpVerifyBody = z.input<typeof otpVerifySchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshBody = z.infer<typeof refreshSchema>;

export const setRoleSchema = z.object({
  role: z.enum(SELECTABLE_ROLES),
});
export type SetRoleBody = z.infer<typeof setRoleSchema>;

// ---------- Responses ----------

export const otpRequestResponseSchema = z.object({
  expiresInSeconds: z.number(),
  resendAfterSeconds: z.number(),
});
export type OtpRequestResponse = z.infer<typeof otpRequestResponseSchema>;

export const userDtoSchema = z.object({
  id: z.string(),
  phone: z.string(),
  name: z.string().nullable(),
  role: z.enum(USER_ROLES).nullable(),
  language: z.enum(LANGUAGES).nullable(),
});
/** DTO = "data transfer object": the user as the API sends it (no private fields). */
export type UserDto = z.infer<typeof userDtoSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

export const authResponseSchema = authTokensSchema.extend({
  user: userDtoSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

// ---------- Errors ----------

/** Machine-readable error codes. The app turns them into translated messages. */
export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'OTP_TOO_SOON',
  'OTP_TOO_MANY_REQUESTS',
  'OTP_INVALID',
  'OTP_EXPIRED',
  'OTP_TOO_MANY_ATTEMPTS',
  'UNAUTHORIZED',
  'USER_BLOCKED',
  'NOT_FOUND',
  'FORBIDDEN',
  'CONFLICT',
  'REGION_NOT_ACTIVE',
  'TOO_MANY_OPEN_REQUESTS',
  'UPLOAD_NOT_FOUND',
  'NOT_A_MASTER',
  'MASTER_NOT_VERIFIED',
  'MASTER_NOT_AVAILABLE',
  'REQUEST_NOT_OPEN',
  'TOO_MANY_OFFERS',
  'OFFER_ALREADY_SENT',
  'OFFER_NOT_AVAILABLE',
  'JOB_STATUS_NOT_ALLOWED',
  'PRICE_CHANGE_PENDING',
  'JOB_NOT_DONE',
  'REVIEW_ALREADY_EXISTS',
  'GUARANTEE_EXPIRED',
  'CLAIM_ALREADY_OPEN',
  'ADMIN_LOGIN_FAILED',
  'CHAT_CLOSED',
  'CALLS_DISABLED',
  'JOB_NOT_ACTIVE',
  'CALL_NOT_RINGING',
  'ONLINE_PAYMENTS_DISABLED',
  'PAYMENT_LOCKED',
  'PARTS_TOO_EXPENSIVE',
  'RECEIPT_NOT_PENDING',
  'NOTHING_TO_CONFIRM',
  'PROMO_NOT_FOUND',
  'PROMO_ALREADY_USED',
  'PROMO_FIRST_ORDER_ONLY',
  'DISCOUNT_ALREADY_APPLIED',
  'REFERRAL_NOT_ALLOWED',
  'INTERNAL_ERROR',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    /** Seconds to wait before retrying (for OTP_TOO_SOON). */
    retryAfterSeconds: z.number().optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
