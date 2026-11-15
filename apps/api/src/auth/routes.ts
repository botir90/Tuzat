import type { FastifyInstance } from 'fastify';
import {
  otpRequestSchema,
  otpVerifySchema,
  refreshSchema,
  type AuthResponse,
  type AuthTokens,
  type OtpRequestResponse,
} from '@usta/shared';
import type { AppContext } from '../context';
import { AppError } from '../lib/errors';
import { languageToDb, toUserDto } from '../users/dto';

export function registerAuthRoutes(app: FastifyInstance, ctx: AppContext): void {
  // Step 1: the user enters a phone number; we send a code.
  app.post('/auth/otp/request', async (request): Promise<OtpRequestResponse> => {
    const { phone } = otpRequestSchema.parse(request.body);
    return ctx.otp.request(phone);
  });

  // Step 2: the user enters the code; we log them in (creating the account if new).
  app.post('/auth/otp/verify', async (request): Promise<AuthResponse> => {
    const body = otpVerifySchema.parse(request.body);
    await ctx.otp.verify(body.phone, body.code);

    const existing = await ctx.prisma.user.findUnique({ where: { phone: body.phone } });
    if (existing?.isBlocked) throw new AppError('USER_BLOCKED', 403);

    const user = existing
      ? await ctx.prisma.user.update({
          where: { id: existing.id },
          data: {
            // Keep an existing role; only fill it in when it's still empty.
            role: existing.role ?? body.role ?? null,
            language: body.language ? languageToDb(body.language) : existing.language,
          },
        })
      : await ctx.prisma.user.create({
          data: {
            phone: body.phone,
            role: body.role ?? null,
            language: body.language ? languageToDb(body.language) : null,
          },
        });

    const tokens = await ctx.tokens.issueTokens({ userId: user.id, role: user.role });
    return { ...tokens, user: toUserDto(user) };
  });

  // The app calls this when the access token expires.
  app.post('/auth/refresh', async (request): Promise<AuthTokens> => {
    const { refreshToken } = refreshSchema.parse(request.body);
    return ctx.tokens.rotate(refreshToken);
  });

  app.post('/auth/logout', async (request, reply) => {
    const { refreshToken } = refreshSchema.parse(request.body);
    await ctx.tokens.revoke(refreshToken);
    return reply.code(204).send();
  });
}
