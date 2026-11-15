import type { PresignUploadResponse, UploadKind } from '@usta/shared';
import { ApiRequestError, api } from './client';

/**
 * Uploads a local file (photo or voice) and returns its storage key.
 * 1. Ask our API for a pre-signed URL.  2. PUT the bytes straight to storage.
 */
export async function uploadFile(
  kind: UploadKind,
  localUri: string,
  contentType: string,
): Promise<string> {
  const presigned = await api<PresignUploadResponse>('/uploads/presign', {
    method: 'POST',
    body: { kind, contentType },
  });

  let response: Response;
  try {
    // fetch(file://...) reads the local file into a Blob.
    const blob = await (await fetch(localUri)).blob();
    response = await fetch(presigned.uploadUrl, {
      method: 'PUT',
      headers: presigned.headers,
      body: blob,
    });
  } catch {
    throw new ApiRequestError('NETWORK_ERROR', 0);
  }
  if (!response.ok) throw new ApiRequestError('INTERNAL_ERROR', response.status);
  return presigned.key;
}
