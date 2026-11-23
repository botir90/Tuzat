import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerAdminAuthRoutes } from './admin/routes.auth';
import { registerAdminCaseRoutes } from './admin/routes.cases';
import { registerAdminCatalogRoutes } from './admin/routes.catalog';
import { registerAdminPeopleRoutes } from './admin/routes.people';
import { registerAuthRoutes } from './auth/routes';
import { registerCatalogRoutes } from './catalog/routes';
import type { AppContext } from './context';
import { registerErrorHandler } from './lib/error-handler';
import { registerJobRoutes } from './jobs/routes';
import { registerMasterRoutes } from './master/routes';
import { registerRequestRoutes } from './requests/routes';
import { registerHealthRoute, type DatabaseCheck } from './routes/health';
import { registerChatRoutes } from './chat/routes';
import { registerGrowthRoutes } from './growth/routes';
import { registerPaymentRoutes } from './payments/routes';
import { registerTrustRoutes } from './trust/routes';
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

  // The mobile app doesn't need CORS; only the admin panel runs in a browser.
  void app.register(cors, {
    origin: ctx.env.ADMIN_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

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

  // Mobile app API
  registerAuthRoutes(app, ctx);
  registerUserRoutes(app, ctx);
  registerCatalogRoutes(app, ctx);
  registerRequestRoutes(app, ctx);
  registerMasterRoutes(app, ctx);
  registerJobRoutes(app, ctx);
  registerTrustRoutes(app, ctx);
  registerChatRoutes(app, ctx);
  registerPaymentRoutes(app, ctx);
  registerGrowthRoutes(app, ctx);

  // Admin panel API (separate login, see src/admin/auth.ts)
  registerAdminAuthRoutes(app, ctx);
  registerAdminPeopleRoutes(app, ctx);
  registerAdminCatalogRoutes(app, ctx);
  registerAdminCaseRoutes(app, ctx);
  return app;
}
