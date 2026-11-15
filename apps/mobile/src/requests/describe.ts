import type { TFunction } from 'i18next';
import type { RequestDto } from '@usta/shared';
import { formatDateTime } from './schedule';

/** "Now" / "Today" / "16.11 15:00" */
export function describeDesiredTime(t: TFunction, request: RequestDto): string {
  if (request.desiredTime === 'SCHEDULED' && request.scheduledAt) {
    return formatDateTime(request.scheduledAt);
  }
  return t(request.desiredTime === 'NOW' ? 'request.timeNow' : 'request.timeToday');
}

/** First line of the description, or a hint that there is a voice message / photos. */
export function shortDescription(t: TFunction, request: RequestDto): string {
  if (request.description) {
    const firstLine = request.description.split('\n')[0] ?? '';
    return firstLine.length > 80 ? `${firstLine.slice(0, 80)}…` : firstLine;
  }
  if (request.voiceUrl) return t('master.voiceOnly');
  return t('master.photosOnly', { count: request.photoUrls.length });
}
