import type { ApiErrorCode } from '@usta/shared';

/**
 * An expected error with a machine-readable code (see API_ERROR_CODES in @usta/shared).
 * The mobile app shows a translated message for each code.
 */
export class AppError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly statusCode: number,
    public readonly extra: { retryAfterSeconds?: number } = {},
  ) {
    super(code);
    this.name = 'AppError';
  }
}

export const unauthorized = () => new AppError('UNAUTHORIZED', 401);
export const notFound = () => new AppError('NOT_FOUND', 404);
export const forbidden = () => new AppError('FORBIDDEN', 403);
/** The action is not allowed in the current state (e.g. cancelling a finished request). */
export const conflict = () => new AppError('CONFLICT', 409);
