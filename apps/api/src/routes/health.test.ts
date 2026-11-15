import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { healthResponseSchema } from '@usta/shared';
import { buildApp } from '../app';

describe('GET /health', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await app.close();
  });

  it('returns 200 and database "up" when the database answers', async () => {
    app = buildApp({ checkDatabase: async () => true });
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    const body = healthResponseSchema.parse(response.json());
    expect(body.database).toBe('up');
  });

  it('returns 503 and database "down" when the database is unreachable', async () => {
    app = buildApp({ checkDatabase: async () => false });
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(503);
    expect(healthResponseSchema.parse(response.json()).database).toBe('down');
  });

  it('returns 404 for an unknown route', async () => {
    app = buildApp({ checkDatabase: async () => true });
    const response = await app.inject({ method: 'GET', url: '/nope' });

    expect(response.statusCode).toBe(404);
  });
});
