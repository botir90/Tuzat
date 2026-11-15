import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { LANGUAGES, setRoleSchema, type AuthResponse, type UserDto } from '@usta/shared';
import { requireUser } from '../auth/authenticate';
import type { AppContext } from '../context';
import { languageToDb, toUserDto } from './dto';

const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  language: z.enum(LANGUAGES).optional(),
});

export function registerUserRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get('/me', async (request): Promise<UserDto> => {
    const user = await requireUser(ctx, request);
    return toUserDto(user);
  });

  app.patch('/me', async (request): Promise<UserDto> => {
    const user = await requireUser(ctx, request);
    const body = updateMeSchema.parse(request.body);
    const updated = await ctx.prisma.user.update({
      where: { id: user.id },
      data: {
        name: body.name,
        language: body.language ? languageToDb(body.language) : undefined,
      },
    });
    return toUserDto(updated);
  });

  /**
   * Switch between "Customer" and "Master" mode.
   * The role is inside the access token, so we return fresh tokens.
   */
  app.put('/me/role', async (request): Promise<AuthResponse> => {
    const user = await requireUser(ctx, request);
    const { role } = setRoleSchema.parse(request.body);
    const updated = await ctx.prisma.user.update({ where: { id: user.id }, data: { role } });
    const tokens = await ctx.tokens.issueTokens({ userId: updated.id, role: updated.role });
    return { ...tokens, user: toUserDto(updated) };
  });
}
