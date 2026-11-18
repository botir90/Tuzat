import type { FastifyInstance } from 'fastify';
import { adminLoginSchema, type AdminLoginResponse } from '@usta/shared';
import type { AppContext } from '../context';
import { AppError } from '../lib/errors';
import { LoginLimiter, requireAdmin, signAdminToken } from './auth';
import { verifyPassword } from './password';

/** A real hash of a random password: checked when the username is unknown, so the
 * response takes the same time and doesn't reveal which usernames exist. */
const DUMMY_HASH =
  'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(64).toString('base64');

export function registerAdminAuthRoutes(app: FastifyInstance, ctx: AppContext): void {
  const limiter = new LoginLimiter();

  app.post('/admin/auth/login', async (request): Promise<AdminLoginResponse> => {
    const { username, password } = adminLoginSchema.parse(request.body);
    const now = ctx.now();
    if (limiter.isLocked(username, now.getTime())) {
      throw new AppError('OTP_TOO_MANY_REQUESTS', 429);
    }

    const admin = await ctx.prisma.adminUser.findUnique({ where: { username } });
    const ok = await verifyPassword(password, admin?.passwordHash ?? DUMMY_HASH);
    if (!admin || !ok) {
      limiter.fail(username, now.getTime());
      throw new AppError('ADMIN_LOGIN_FAILED', 401);
    }

    limiter.succeed(username);
    await ctx.prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: now } });
    return { token: await signAdminToken(ctx, admin.id), username: admin.username };
  });

  app.get('/admin/me', async (request) => {
    const admin = await requireAdmin(ctx, request);
    return { username: admin.username };
  });
}
