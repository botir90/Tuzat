import { z } from 'zod';
import { USER_ROLES, VERIFICATION_STATUSES, JOB_STATUSES, REQUEST_STATUSES } from './enums';
import { CATEGORY_COLORS, CATEGORY_ICONS } from './catalog';
import { CLAIM_STATUSES, COMPLAINT_STATUSES } from './trust';

/**
 * Admin panel API (apps/admin). Admin texts are Uzbek Latin only: the panel is an internal
 * tool for our team, not a user-facing screen.
 */

export const adminLoginSchema = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(8).max(200),
});
export type AdminLoginBody = z.infer<typeof adminLoginSchema>;
export interface AdminLoginResponse {
  token: string;
  username: string;
}

/** Common paging: newest first, `cursor` = id of the last item of the previous page. */
export const adminListQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export interface AdminPage<T> {
  items: T[];
  nextCursor: string | null;
}

// ---------- Masters ----------

export const adminMastersQuerySchema = adminListQuerySchema.extend({
  status: z.enum(VERIFICATION_STATUSES).optional(),
});

export interface AdminMasterRow {
  userId: string;
  name: string | null;
  phone: string;
  photoUrl: string | null;
  bio: string | null;
  verificationStatus: (typeof VERIFICATION_STATUSES)[number];
  rejectionReason: string | null;
  isAvailable: boolean;
  isBlocked: boolean;
  ratingAvg: number;
  ratingCount: number;
  completedJobsCount: number;
  categories: string[];
  districts: string[];
  workPhotoUrls: string[];
  createdAt: string;
}

export const rejectMasterSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

// ---------- Users ----------

export const adminUsersQuerySchema = adminListQuerySchema.extend({
  /** Part of a phone number, e.g. "90123". */
  phone: z.string().trim().max(20).optional(),
});

export interface AdminUserRow {
  id: string;
  phone: string;
  name: string | null;
  role: (typeof USER_ROLES)[number] | null;
  isBlocked: boolean;
  createdAt: string;
}

// ---------- Catalog ----------

const namesSchema = z.object({
  nameUzLatn: z.string().trim().min(1).max(100),
  nameUzCyrl: z.string().trim().min(1).max(100),
  nameRu: z.string().trim().min(1).max(100),
});

export const updateRegionSchema = z.object({ isActive: z.boolean() });

export const upsertCategorySchema = namesSchema.extend({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,50}$/, 'SLUG_FORMAT'),
  /** Only icons the app knows (CATEGORY_ICONS), so a new trade never shows a broken icon. */
  icon: z.enum(CATEGORY_ICONS),
  color: z.enum(CATEGORY_COLORS),
  /** null = no group (e.g. the 'Other' category). */
  groupId: z.string().min(1).nullable(),
  sortOrder: z.number().int().min(0).max(1000),
  isActive: z.boolean(),
});
export type UpsertCategoryBody = z.infer<typeof upsertCategorySchema>;

export const upsertCategoryGroupSchema = namesSchema.extend({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,50}$/, 'SLUG_FORMAT'),
  sortOrder: z.number().int().min(0).max(1000),
});
export type UpsertCategoryGroupBody = z.infer<typeof upsertCategoryGroupSchema>;

export const upsertPriceItemSchema = namesSchema
  .extend({
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]{2,60}$/, 'SLUG_FORMAT'),
    categoryId: z.string().min(1),
    minPrice: z.number().int().min(0).max(100_000_000),
    maxPrice: z.number().int().min(0).max(100_000_000),
    sortOrder: z.number().int().min(0).max(1000),
  })
  .refine((v) => v.minPrice <= v.maxPrice, { message: 'MIN_GT_MAX', path: ['maxPrice'] });
export type UpsertPriceItemBody = z.infer<typeof upsertPriceItemSchema>;

export const regionPriceSchema = z
  .object({
    minPrice: z.number().int().min(0).max(100_000_000),
    maxPrice: z.number().int().min(0).max(100_000_000),
  })
  .refine((v) => v.minPrice <= v.maxPrice, { message: 'MIN_GT_MAX', path: ['maxPrice'] });

// ---------- Orders, claims, complaints ----------

export const adminRequestsQuerySchema = adminListQuerySchema.extend({
  status: z.enum(REQUEST_STATUSES).optional(),
});

export interface AdminRequestRow {
  id: string;
  status: (typeof REQUEST_STATUSES)[number];
  category: string;
  district: string;
  region: string;
  customerPhone: string;
  description: string | null;
  offerCount: number;
  job: {
    id: string;
    status: (typeof JOB_STATUSES)[number];
    masterName: string | null;
    price: number;
  } | null;
  createdAt: string;
}

export const adminClaimsQuerySchema = adminListQuerySchema.extend({
  status: z.enum(CLAIM_STATUSES).optional(),
});
export const adminComplaintsQuerySchema = adminListQuerySchema.extend({
  status: z.enum(COMPLAINT_STATUSES).optional(),
});

export interface AdminCaseRow {
  id: string;
  /** Guarantee claim description or complaint text. */
  text: string;
  status: string;
  adminNote: string | null;
  jobId: string;
  category: string;
  customerPhone: string;
  masterName: string | null;
  masterPhone: string;
  /** Who complained (complaints only). */
  fromPhone: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export const resolveClaimSchema = z.object({
  status: z.enum(['RESOLVED', 'REJECTED']),
  adminNote: z.string().trim().max(1000).optional(),
});
export const resolveComplaintSchema = z.object({
  adminNote: z.string().trim().max(1000).optional(),
});

export interface AdminWaitlistRow {
  region: string;
  district: string | null;
  category: string | null;
  count: number;
}

export interface AdminStats {
  pendingMasters: number;
  openRequests: number;
  activeJobs: number;
  openClaims: number;
  openComplaints: number;
  waitlist: number;
}
