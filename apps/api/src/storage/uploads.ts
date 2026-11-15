import { UPLOAD_RULES, type UploadKind } from '@usta/shared';
import { AppError } from '../lib/errors';
import type { FileStorage } from './storage';

/** Every upload lives under the uploader's folder, so nobody can attach someone else's file. */
export const uploadPrefix = (userId: string, kind: UploadKind) => `uploads/${userId}/${kind}/`;

/** Checks that a key belongs to this user, exists, and is not too big. */
export async function assertUpload(
  storage: FileStorage,
  userId: string,
  kind: UploadKind,
  key: string,
): Promise<void> {
  if (!key.startsWith(uploadPrefix(userId, kind))) throw new AppError('UPLOAD_NOT_FOUND', 400);
  const info = await storage.head(key);
  if (!info || info.size === 0 || info.size > UPLOAD_RULES[kind].maxBytes) {
    throw new AppError('UPLOAD_NOT_FOUND', 400);
  }
}
