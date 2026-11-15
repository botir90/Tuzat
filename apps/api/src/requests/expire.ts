import type { PrismaClient } from '../generated/prisma/client';

/**
 * OPEN requests whose 24 hours are over become EXPIRED.
 * Called before reading requests and every few minutes by a timer (see index.ts).
 */
export async function expireOldRequests(prisma: PrismaClient, now: Date): Promise<number> {
  const { count } = await prisma.request.updateMany({
    where: { status: 'OPEN', expiresAt: { lte: now } },
    data: { status: 'EXPIRED' },
  });
  return count;
}
