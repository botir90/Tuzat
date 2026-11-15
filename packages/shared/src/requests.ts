import { z } from 'zod';
import { REQUEST_STATUSES } from './enums';
import { localizedTextSchema } from './catalog';

// ---------- Business limits (CLAUDE.md section 7) ----------

export const MAX_PHOTOS_PER_REQUEST = 5;
export const MAX_OPEN_REQUESTS_PER_CUSTOMER = 3;
export const REQUEST_TTL_HOURS = 24;
export const MAX_DESCRIPTION_LENGTH = 1000;
/** How far ahead a customer can schedule a visit. */
export const MAX_SCHEDULE_DAYS = 14;

// ---------- Uploads ----------

export const UPLOAD_KINDS = [
  'request-photo',
  'request-voice',
  'master-photo',
  'master-work',
] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export const UPLOAD_RULES: Record<
  UploadKind,
  { contentTypes: readonly string[]; maxBytes: number }
> = {
  'request-photo': {
    contentTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 5 * 1024 * 1024,
  },
  'master-photo': {
    contentTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 5 * 1024 * 1024,
  },
  'master-work': {
    contentTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 5 * 1024 * 1024,
  },
  'request-voice': {
    contentTypes: ['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/mpeg'],
    maxBytes: 10 * 1024 * 1024,
  },
};

export const presignUploadSchema = z
  .object({
    kind: z.enum(UPLOAD_KINDS),
    contentType: z.string(),
  })
  .refine((v) => UPLOAD_RULES[v.kind].contentTypes.includes(v.contentType), {
    message: 'UNSUPPORTED_CONTENT_TYPE',
    path: ['contentType'],
  });
export type PresignUploadBody = z.infer<typeof presignUploadSchema>;

export interface PresignUploadResponse {
  /** Pass this key back when creating the request. */
  key: string;
  /** PUT the file bytes to this URL. */
  uploadUrl: string;
  /** Headers that must be sent with the PUT. */
  headers: Record<string, string>;
}

// ---------- Requests ----------

export const DESIRED_TIMES = ['NOW', 'TODAY', 'SCHEDULED'] as const;
export type DesiredTime = (typeof DESIRED_TIMES)[number];

export const createRequestSchema = z
  .object({
    categoryId: z.string().min(1),
    description: z.string().trim().max(MAX_DESCRIPTION_LENGTH).optional(),
    photoKeys: z.array(z.string().min(1)).max(MAX_PHOTOS_PER_REQUEST).default([]),
    voiceKey: z.string().min(1).optional(),
    districtId: z.string().min(1),
    /** Street, house, apartment. */
    address: z.string().trim().min(3).max(300),
    /** "Near the 5th school" — landmarks matter in Uzbekistan. */
    landmark: z.string().trim().max(300).optional(),
    lat: z.number().min(37).max(46).optional(),
    lng: z.number().min(55).max(74).optional(),
    desiredTime: z.enum(DESIRED_TIMES),
    scheduledAt: z.iso.datetime().optional(),
  })
  .refine((v) => Boolean(v.description) || v.photoKeys.length > 0 || Boolean(v.voiceKey), {
    message: 'DESCRIPTION_REQUIRED',
    path: ['description'],
  })
  .refine((v) => (v.desiredTime === 'SCHEDULED') === Boolean(v.scheduledAt), {
    message: 'SCHEDULED_AT_REQUIRED',
    path: ['scheduledAt'],
  })
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), {
    message: 'LAT_LNG_TOGETHER',
    path: ['lat'],
  });
export type CreateRequestBody = z.input<typeof createRequestSchema>;

export const requestDtoSchema = z.object({
  id: z.string(),
  status: z.enum(REQUEST_STATUSES),
  category: z.object({ id: z.string(), name: localizedTextSchema, icon: z.string() }),
  description: z.string().nullable(),
  /** Short-lived download links (refresh by loading the request again). */
  photoUrls: z.array(z.string()),
  voiceUrl: z.string().nullable(),
  district: z.object({ id: z.string(), name: localizedTextSchema }),
  region: z.object({ id: z.string(), name: localizedTextSchema }),
  /** Exact address; hidden from masters until their offer is accepted (null then). */
  address: z.string().nullable(),
  landmark: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  desiredTime: z.enum(DESIRED_TIMES),
  scheduledAt: z.string().nullable(),
  createdAt: z.string(),
  expiresAt: z.string(),
  offerCount: z.number().int(),
});
export type RequestDto = z.infer<typeof requestDtoSchema>;
