import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@usta/shared';
import { buildApp } from '../app';
import { useTestApp } from '../../test/helpers';

describe('GET /health', () => {
  const t = useTestApp();

  it('returns 200 and database "up" when the database answers', async () => {
    const response = await t.app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(response.json()).database).toBe('up');
  });

  it('returns 503 and database "down" when the database is unreachable', async () => {
    const app = buildApp(t.ctx, { checkDatabase: async () => false });
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(503);
    expect(healthResponseSchema.parse(response.json()).database).toBe('down');
  });

  it('returns 404 with NOT_FOUND for an unknown route', async () => {
    const response = await t.app.inject({ method: 'GET', url: '/nope' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: { code: 'NOT_FOUND' } });
  });
});
