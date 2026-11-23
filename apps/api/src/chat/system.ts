import type { ChatSystemEvent } from '@usta/shared';
import type { Prisma, PrismaClient } from '../generated/prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Writes an event into the job's chat ("The master is on the way", "Price approved: 150 000").
 * The phone turns `event` + `params` into text in the viewer's language.
 */
export async function addSystemMessage(
  db: Db,
  jobId: string,
  event: ChatSystemEvent,
  params: Record<string, string> = {},
  now: Date = new Date(),
): Promise<void> {
  await db.chatMessage.create({
    data: { jobId, type: 'SYSTEM', text: event, params, createdAt: now },
  });
}
