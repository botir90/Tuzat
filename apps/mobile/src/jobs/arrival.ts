import type { TFunction } from 'i18next';
import { formatDateTime } from '@/requests/schedule';

/**
 * When the master arrives, in words: "25 daqiqa" / "2 soat" when it is soon,
 * otherwise the date and time.
 */
export function arrivalText(t: TFunction, arrivalAt: string, now: Date = new Date()): string {
  const minutes = Math.round((new Date(arrivalAt).getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) return t('offers.arriveNow');
  if (minutes < 60) return t('offers.inMinutes', { count: minutes });
  if (minutes < 6 * 60 && minutes % 60 === 0) return t('offers.inHours', { count: minutes / 60 });
  if (minutes < 6 * 60) {
    return t('offers.inHoursMinutes', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
  }
  return formatDateTime(arrivalAt);
}
