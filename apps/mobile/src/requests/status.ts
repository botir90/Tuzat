import type { RequestStatus } from '@usta/shared';

/** Notice color for each request status. */
export const REQUEST_STATUS_TONE: Record<RequestStatus, 'info' | 'warning' | 'error'> = {
  OPEN: 'info',
  ASSIGNED: 'info',
  CANCELLED: 'warning',
  EXPIRED: 'warning',
};
