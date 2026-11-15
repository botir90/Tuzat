import type { FastifyRequest } from 'fastify';
import { AppError, unauthorized } from '../lib/errors';
import type { User } from '../generated/prisma/client';
import type { AppContext } from '../context';

/**
 * Reads "Authorization: Bearer <token>", checks it and loads the user.
 * Use inside a route: const user = await requireUser(ctx, request);
 */
export async function requireUser(ctx: AppContext, request: FastifyRequest): Promise<User> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw unauthorized();

  const { userId } = await ctx.tokens.verifyAccessToken(header.slice('Bearer '.length));
  const user = await ctx.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized();
  if (user.isBlocked) throw new AppError('USER_BLOCKED', 403);
  return user;
}
