import { formatSum, formatUzPhone } from '@usta/shared';

export const sum = (amount: number) => `${formatSum(amount)} so'm`;
export const phone = formatUzPhone;

/** "18.11.2026 15:04" */
export function dateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Uzbek labels for statuses shown in the tables. */
export const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Tekshiruvda',
  VERIFIED: 'Tasdiqlangan',
  REJECTED: 'Rad etilgan',
  OPEN: 'Ochiq',
  ASSIGNED: 'Usta tanlangan',
  CANCELLED: 'Bekor qilingan',
  EXPIRED: 'Muddati tugagan',
  RESOLVED: 'Hal qilingan',
  ACCEPTED: 'Qabul qilingan',
  ON_THE_WAY: "Yo'lda",
  IN_PROGRESS: 'Ishlayapti',
  DONE: 'Tugagan',
  CUSTOMER: 'Mijoz',
  MASTER: 'Usta',
  ADMIN: 'Admin',
};

export const label = (status: string | null) => (status ? (STATUS_LABEL[status] ?? status) : '—');
