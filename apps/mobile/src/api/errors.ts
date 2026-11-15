import type { TFunction } from 'i18next';
import { ApiRequestError } from './client';

/** Turns any error into a friendly, translated sentence that says what to do next. */
export function errorMessage(t: TFunction, error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.code === 'OTP_TOO_SOON') {
      return t('errors.OTP_TOO_SOON', { seconds: error.retryAfterSeconds ?? 60 });
    }
    return t(`errors.${error.code}`);
  }
  return t('errors.UNKNOWN');
}
