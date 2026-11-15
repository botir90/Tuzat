import { SignJWT, jwtVerify } from 'jose';
import type { AuthTokens, UserRole } from '@usta/shared';
import type { PrismaClient } from '../generated/prisma/client';
import { AppError, unauthorized } from '../lib/errors';
import { generateRefreshToken, hashToken } from './crypto';

export interface AccessTokenPayload {
  userId: string;
  role: UserRole | null;
}

export interface TokenServiceOptions {
  prisma: PrismaClient;
  accessSecret: string;
  accessTtlSeconds: number;
  refreshTtlDays: number;
  now: () => Date;
}

/**
 * Access token: short-lived JWT (15 min), checked without a database query.
 * Refresh token: long-lived random string, stored hashed, replaced on every use ("rotation").
 */
export class TokenService {
  private readonly key: Uint8Array;

  constructor(private readonly opts: TokenServiceOptions) {
    this.key = new TextEncoder().encode(opts.accessSecret);
  }

  async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    const nowSeconds = Math.floor(this.opts.now().getTime() / 1000);
    return new SignJWT({ role: payload.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(payload.userId)
      .setIssuedAt(nowSeconds)
      .setExpirationTime(nowSeconds + this.opts.accessTtlSeconds)
      .sign(this.key);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        algorithms: ['HS256'],
        currentDate: this.opts.now(),
      });
      if (!payload.sub) throw unauthorized();
      const role = typeof payload.role === 'string' ? (payload.role as UserRole) : null;
      return { userId: payload.sub, role };
    } catch {
      throw unauthorized();
    }
  }

  /** Creates a new access + refresh token pair for a user. */
  async issueTokens(payload: AccessTokenPayload): Promise<AuthTokens> {
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(this.opts.now().getTime() + this.opts.refreshTtlDays * 86_400_000);
    await this.opts.prisma.refreshToken.create({
      data: { userId: payload.userId, tokenHash: hashToken(refreshToken), expiresAt },
    });
    return { accessToken: await this.signAccessToken(payload), refreshToken };
  }

  /**
   * Exchanges a refresh token for a new pair. The old one stops working.
   * If an already-used token comes back, someone may have stolen it,
   * so we log the user out everywhere.
   */
  async rotate(refreshToken: string): Promise<AuthTokens> {
    const { prisma } = this.opts;
    const now = this.opts.now();
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });
    if (!stored) throw unauthorized();

    if (stored.revokedAt) {
      await this.revokeAllForUser(stored.userId);
      throw unauthorized();
    }
    if (stored.expiresAt <= now) throw unauthorized();
    if (stored.user.isBlocked) throw new AppError('USER_BLOCKED', 403);

    // updateMany with revokedAt: null makes this safe if two requests race.
    const { count } = await prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: now },
    });
    if (count === 0) throw unauthorized();

    return this.issueTokens({ userId: stored.userId, role: stored.user.role });
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.opts.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: this.opts.now() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.opts.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: this.opts.now() },
    });
  }
}
