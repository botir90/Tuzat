import Fastify, { type FastifyInstance } from 'fastify';
import { registerHealthRoute, type DatabaseCheck } from './routes/health';

export interface AppDeps {
  checkDatabase: DatabaseCheck;
  logger?: boolean;
}

/** Builds the Fastify app without starting it. Tests call this directly. */
export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({ logger: deps.logger ?? false });
  registerHealthRoute(app, deps.checkDatabase);
  return app;
}
