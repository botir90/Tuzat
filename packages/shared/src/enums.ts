// Status and role values shared by the API (Prisma enums) and the mobile app.

export const USER_ROLES = ['CUSTOMER', 'MASTER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const REQUEST_STATUSES = ['OPEN', 'ASSIGNED', 'CANCELLED', 'EXPIRED'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const OFFER_STATUSES = ['SENT', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const JOB_STATUSES = ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const PRICE_CHANGE_STATUSES = ['PENDING', 'APPROVED', 'DECLINED'] as const;
export type PriceChangeStatus = (typeof PRICE_CHANGE_STATUSES)[number];
