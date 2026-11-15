import type { FastifyRequest } from 'fastify';
import type { Env } from '../env';

/**
 * The address the PHONE uses to reach file storage.
 * - S3_PUBLIC_ENDPOINT if set (production, or a fixed dev address).
 * - In development: the same host the phone used to reach the API, with the storage port.
 *   This keeps working when the hotspot IP changes.
 */
export function publicStorageEndpoint(env: Env, request: FastifyRequest): string {
  if (env.S3_PUBLIC_ENDPOINT) return env.S3_PUBLIC_ENDPOINT;
  if (env.NODE_ENV !== 'production') {
    const host = request.hostname.split(':')[0];
    const port = new URL(env.S3_ENDPOINT).port;
    return `http://${host}${port ? `:${port}` : ''}`;
  }
  return env.S3_ENDPOINT;
}
