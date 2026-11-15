import type { FastifyInstance } from 'fastify';
import type { HealthResponse } from '@usta/shared';

/** Returns true when the database answers, false otherwise. Injected so tests can fake it. */
export type DatabaseCheck = () => Promise<boolean>;

export function registerHealthRoute(app: FastifyInstance, checkDatabase: DatabaseCheck): void {
  app.get('/health', async (_request, reply) => {
    const databaseUp = await checkDatabase();
    const body: HealthResponse = {
      status: 'ok',
      database: databaseUp ? 'up' : 'down',
      time: new Date().toISOString(),
    };
    // 503 tells monitoring tools the service is not fully healthy.
    return reply.code(databaseUp ? 200 : 503).send(body);
  });
}
