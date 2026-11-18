import type { FastifyRequest } from 'fastify';
import { SignJWT, jwtVerify } from 'jose';
import type { AppContext } from '../context';
import type { AdminUser } from '../generated/prisma/client';
import { AppError } from '../lib/errors';

const ADMIN_AUDIENCE = 'usta-admin';
const ADMIN_TOKEN_TTL_SECONDS = 12 * 60 * 60; // one working day

const key = (secret: string) => new TextEncoder().encode(secret);

/** Admin tokens use their own secret and audience: an app token can never open the panel. */
export function signAdminToken(ctx: AppContext, adminId: string): Promise<string> {
  const now = Math.floor(ctx.now().getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(adminId)
    .setAudience(ADMIN_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + ADMIN_TOKEN_TTL_SECONDS)
    .sign(key(ctx.env.ADMIN_JWT_SECRET));
}

export async function requireAdmin(ctx: AppContext, request: FastifyRequest): Promise<AdminUser> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new AppError('UNAUTHORIZED', 401);
  try {
    const { payload } = await jwtVerify(header.slice(7), key(ctx.env.ADMIN_JWT_SECRET), {
      algorithms: ['HS256'],
      audience: ADMIN_AUDIENCE,
      currentDate: ctx.now(),
    });
    const admin = payload.sub
      ? await ctx.prisma.adminUser.findUnique({ where: { id: payload.sub } })
      : null;
    if (!admin) throw new Error('unknown admin');
    return admin;
  } catch {
    throw new AppError('UNAUTHORIZED', 401);
  }
}

/**
 * Slows down password guessing: after 5 wrong passwords for a username,
 * that username is locked for 15 minutes. Kept in memory (one API server).
 */
export class LoginLimiter {
  private readonly failures = new Map<string, { count: number; firstAt: number }>();

  constructor(
    private readonly maxFailures = 5,
    private readonly windowMs = 15 * 60_000,
  ) {}

  isLocked(username: string, now: number): boolean {
    const entry = this.failures.get(username);
    if (!entry) return false;
    if (now - entry.firstAt > this.windowMs) {
      this.failures.delete(username);
      return false;
    }
    return entry.count >= this.maxFailures;
  }

  fail(username: string, now: number): void {
    const entry = this.failures.get(username);
    if (!entry || now - entry.firstAt > this.windowMs) {
      this.failures.set(username, { count: 1, firstAt: now });
    } else {
      entry.count += 1;
    }
  }

  succeed(username: string): void {
    this.failures.delete(username);
  }
}
