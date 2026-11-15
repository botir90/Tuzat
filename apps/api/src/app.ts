import Fastify, { type FastifyInstance } from 'fastify';
import { registerAuthRoutes } from './auth/routes';
import { registerCatalogRoutes } from './catalog/routes';
import type { AppContext } from './context';
import { registerErrorHandler } from './lib/error-handler';
import { registerRequestRoutes } from './requests/routes';
import { registerHealthRoute, type DatabaseCheck } from './routes/health';
import { registerUserRoutes } from './users/routes';

export interface BuildAppOptions {
  logger?: boolean;
  /** Override for tests; by default runs "SELECT 1" on the database. */
  checkDatabase?: DatabaseCheck;
}

/** Builds the Fastify app without starting it. Tests call this directly. */
export function buildApp(ctx: AppContext, options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? false });
  registerErrorHandler(app);

  const checkDatabase: DatabaseCheck =
    options.checkDatabase ??
    (async () => {
      try {
        await ctx.prisma.$queryRaw`SELECT 1`;
        return true;
      } catch {
        return false;
      }
    });

  registerHealthRoute(app, checkDatabase);
  registerAuthRoutes(app, ctx);
  registerUserRoutes(app, ctx);
  registerCatalogRoutes(app, ctx);
  registerRequestRoutes(app, ctx);
  return app;
}
