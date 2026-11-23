import type { FastifyInstance, FastifyRequest } from 'fastify';
import { AccessToken } from 'livekit-server-sdk';
import { z } from 'zod';
import {
  CALL_RING_SECONDS,
  CHAT_PAGE_SIZE,
  CHAT_SYSTEM_EVENTS,
  chatMessagesQuerySchema,
  sendChatMessageSchema,
  type CallDto,
  type CallJoinDto,
  type ChatMessageDto,
  type ChatSystemEvent,
} from '@usta/shared';
import { requireUser } from '../auth/authenticate';
import type { AppContext } from '../context';
import type { Call, ChatMessage, User } from '../generated/prisma/client';
import { AppError, notFound } from '../lib/errors';
import { notifyInBackground, notifyUsers } from '../push/notify';
import { publicStorageEndpoint } from '../storage/public-endpoint';
import type { FileStorage } from '../storage/storage';
import { assertUpload } from '../storage/uploads';
import { addSystemMessage } from './system';

const idParams = z.object({ id: z.string().min(1) });

/** Chat and calls work while the job is going on (not after DONE or CANCELLED). */
const ACTIVE_JOB_STATUSES = ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS'] as const;
/** A LiveKit token is enough to join; keep it short-lived. */
const CALL_TOKEN_TTL = '10m';
/** The chat stays open for a week after the job ends (photos of the result, thanks). */
const CHAT_AFTER_DONE_MS = 7 * 24 * 60 * 60 * 1000;

type CallWithPeople = Call & {
  caller: { name: string | null };
  callee: { name: string | null };
};

async function toMessageDto(
  m: ChatMessage,
  viewerId: string,
  storage: FileStorage,
  endpoint: string,
): Promise<ChatMessageDto> {
  const isSystem = m.type === 'SYSTEM';
  const event =
    isSystem && (CHAT_SYSTEM_EVENTS as readonly string[]).includes(m.text ?? '')
      ? (m.text as ChatSystemEvent)
      : null;
  return {
    id: m.id,
    type: m.type,
    text: isSystem ? null : m.text,
    mediaUrl: m.mediaKey ? await storage.presignDownload(m.mediaKey, endpoint) : null,
    durationMs: m.durationMs,
    event,
    params: isSystem ? ((m.params ?? {}) as Record<string, string>) : null,
    mine: m.senderId === viewerId,
    createdAt: m.createdAt.toISOString(),
  };
}

function toCallDto(call: CallWithPeople, viewerId: string): CallDto {
  const outgoing = call.callerId === viewerId;
  return {
    id: call.id,
    jobId: call.jobId,
    status: call.status,
    direction: outgoing ? 'OUTGOING' : 'INCOMING',
    otherName: outgoing ? call.callee.name : call.caller.name,
    createdAt: call.createdAt.toISOString(),
    answeredAt: call.answeredAt?.toISOString() ?? null,
    endedAt: call.endedAt?.toISOString() ?? null,
  };
}

const callInclude = {
  caller: { select: { name: true } },
  callee: { select: { name: true } },
} as const;

export function registerChatRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { prisma, storage } = ctx;
  const endpoint = (request: FastifyRequest) => publicStorageEndpoint(ctx.env, request);

  /** A job the user takes part in, plus who the other side is. */
  async function loadJob(id: string, user: User) {
    const job = await prisma.job.findUnique({
      where: { id },
      include: { customer: true, master: true },
    });
    if (!job || (job.customerId !== user.id && job.masterId !== user.id)) throw notFound();
    const otherId = job.customerId === user.id ? job.masterId : job.customerId;
    return { job, otherId };
  }

  function chatIsOpen(job: { status: string; doneAt: Date | null; cancelledAt: Date | null }) {
    if ((ACTIVE_JOB_STATUSES as readonly string[]).includes(job.status)) return true;
    const endedAt = job.doneAt ?? job.cancelledAt;
    return (
      job.status === 'DONE' &&
      endedAt !== null &&
      ctx.now().getTime() - endedAt.getTime() < CHAT_AFTER_DONE_MS
    );
  }

  // ---------- Chat ----------

  /** Messages, oldest first. With ?after=<id> only newer ones (the app polls every few seconds). */
  app.get('/jobs/:id/messages', async (request): Promise<ChatMessageDto[]> => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    const { after } = chatMessagesQuerySchema.parse(request.query);
    await loadJob(id, user);
    await expireRingingCalls(id);

    let since: number | undefined;
    if (after) {
      const anchor = await prisma.chatMessage.findFirst({ where: { id: after, jobId: id } });
      since = anchor?.seq;
    }
    const messages = since
      ? await prisma.chatMessage.findMany({
          where: { jobId: id, seq: { gt: since } },
          orderBy: { seq: 'asc' },
          take: CHAT_PAGE_SIZE,
        })
      : // First load: the latest page, shown oldest first.
        (
          await prisma.chatMessage.findMany({
            where: { jobId: id },
            orderBy: { seq: 'desc' },
            take: CHAT_PAGE_SIZE,
          })
        ).reverse();
    const ep = endpoint(request);
    return Promise.all(messages.map((m) => toMessageDto(m, user.id, storage, ep)));
  });

  app.post('/jobs/:id/messages', async (request, reply) => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    const body = sendChatMessageSchema.parse(request.body);
    const { job, otherId } = await loadJob(id, user);
    if (!chatIsOpen(job)) throw new AppError('CHAT_CLOSED', 409);

    if (body.type === 'PHOTO') await assertUpload(storage, user.id, 'chat-photo', body.mediaKey);
    if (body.type === 'VOICE') await assertUpload(storage, user.id, 'chat-voice', body.mediaKey);

    const message = await prisma.chatMessage.create({
      data: {
        jobId: id,
        senderId: user.id,
        type: body.type,
        text: body.type === 'TEXT' ? body.text : null,
        mediaKey: body.type === 'TEXT' ? null : body.mediaKey,
        durationMs: body.type === 'VOICE' ? body.durationMs : null,
        createdAt: ctx.now(),
      },
    });

    const senderName = user.name ?? '';
    const preview: Record<string, string> = {
      'uz-Latn': body.type === 'PHOTO' ? '📷 Rasm' : body.type === 'VOICE' ? '🎤 Ovozli xabar' : '',
      'uz-Cyrl': body.type === 'PHOTO' ? '📷 Расм' : body.type === 'VOICE' ? '🎤 Овозли хабар' : '',
      ru: body.type === 'PHOTO' ? '📷 Фото' : body.type === 'VOICE' ? '🎤 Голосовое' : '',
    };
    notifyInBackground(
      ctx,
      notifyUsers(
        ctx,
        [otherId],
        'chatMessage',
        (lang) => ({
          name: senderName,
          preview: body.type === 'TEXT' ? body.text.slice(0, 120) : (preview[lang] ?? ''),
        }),
        { type: 'chat', jobId: id },
      ),
    );
    return reply.code(201).send(await toMessageDto(message, user.id, storage, endpoint(request)));
  });

  // ---------- Calls ----------

  function livekitConfig() {
    const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = ctx.env;
    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      throw new AppError('CALLS_DISABLED', 503);
    }
    return { url: LIVEKIT_URL, key: LIVEKIT_API_KEY, secret: LIVEKIT_API_SECRET };
  }

  /** A token that lets exactly this user into exactly this call's room, for 10 minutes. */
  async function joinInfo(call: CallWithPeople, user: User): Promise<CallJoinDto> {
    const lk = livekitConfig();
    const token = new AccessToken(lk.key, lk.secret, {
      identity: user.id,
      name: user.name ?? undefined,
      ttl: CALL_TOKEN_TTL,
    });
    token.addGrant({
      room: `call-${call.id}`,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: false,
    });
    return { call: toCallDto(call, user.id), livekitUrl: lk.url, token: await token.toJwt() };
  }

  /** Calls nobody answered in time become MISSED (checked lazily, no timers needed). */
  async function expireRingingCalls(jobId: string): Promise<void> {
    const limit = new Date(ctx.now().getTime() - CALL_RING_SECONDS * 1000);
    const stale = await prisma.call.findMany({
      where: { jobId, status: 'RINGING', createdAt: { lt: limit } },
    });
    for (const call of stale) await markMissed(call);
  }

  async function markMissed(call: Call): Promise<void> {
    const { count } = await prisma.call.updateMany({
      where: { id: call.id, status: 'RINGING' },
      data: { status: 'MISSED', endedAt: ctx.now() },
    });
    if (count === 0) return; // someone else already changed it
    await addSystemMessage(prisma, call.jobId, 'CALL_MISSED', {}, ctx.now());
    const caller = await prisma.user.findUnique({ where: { id: call.callerId } });
    notifyInBackground(
      ctx,
      notifyUsers(ctx, [call.calleeId], 'missedCall', () => ({ name: caller?.name ?? '' }), {
        type: 'chat',
        jobId: call.jobId,
      }),
    );
  }

  async function loadCall(id: string, user: User): Promise<CallWithPeople> {
    const call = await prisma.call.findUnique({ where: { id }, include: callInclude });
    if (!call || (call.callerId !== user.id && call.calleeId !== user.id)) throw notFound();
    await expireRingingCalls(call.jobId);
    return (await prisma.call.findUnique({ where: { id }, include: callInclude }))!;
  }

  /** Start a call to the other side of an active job. Phone numbers are never shared. */
  app.post('/jobs/:id/calls', async (request, reply) => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    livekitConfig();
    const { job, otherId } = await loadJob(id, user);
    if (!(ACTIVE_JOB_STATUSES as readonly string[]).includes(job.status)) {
      throw new AppError('JOB_NOT_ACTIVE', 409);
    }
    await expireRingingCalls(id);
    // Only one call per job at a time: a new call ends the old one.
    await prisma.call.updateMany({
      where: { jobId: id, status: { in: ['RINGING', 'ANSWERED'] } },
      data: { status: 'ENDED', endedAt: ctx.now() },
    });

    const call = await prisma.call.create({
      data: { jobId: id, callerId: user.id, calleeId: otherId, createdAt: ctx.now() },
      include: callInclude,
    });
    notifyInBackground(
      ctx,
      notifyUsers(
        ctx,
        [otherId],
        'incomingCall',
        () => ({ name: user.name ?? '' }),
        { type: 'call', callId: call.id, jobId: id },
        { priority: 'high', channelId: 'calls' },
      ),
    );
    return reply.code(201).send(await joinInfo(call, user));
  });

  /** The phone that rings asks: is there a call for me right now? */
  app.get('/calls/incoming', async (request): Promise<CallDto | null> => {
    const user = await requireUser(ctx, request);
    const limit = new Date(ctx.now().getTime() - CALL_RING_SECONDS * 1000);
    const call = await prisma.call.findFirst({
      where: { calleeId: user.id, status: 'RINGING', createdAt: { gte: limit } },
      orderBy: { createdAt: 'desc' },
      include: callInclude,
    });
    return call ? toCallDto(call, user.id) : null;
  });

  app.get('/calls/:id', async (request): Promise<CallDto> => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    return toCallDto(await loadCall(id, user), user.id);
  });

  app.post('/calls/:id/answer', async (request): Promise<CallJoinDto> => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    livekitConfig();
    const call = await loadCall(id, user);
    if (call.calleeId !== user.id) throw new AppError('FORBIDDEN', 403);
    const { count } = await prisma.call.updateMany({
      where: { id, status: 'RINGING' },
      data: { status: 'ANSWERED', answeredAt: ctx.now() },
    });
    if (count === 0) throw new AppError('CALL_NOT_RINGING', 409);
    return joinInfo((await prisma.call.findUnique({ where: { id }, include: callInclude }))!, user);
  });

  app.post('/calls/:id/decline', async (request): Promise<CallDto> => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    const call = await loadCall(id, user);
    if (call.calleeId !== user.id) throw new AppError('FORBIDDEN', 403);
    await prisma.call.updateMany({
      where: { id, status: 'RINGING' },
      data: { status: 'DECLINED', endedAt: ctx.now() },
    });
    return toCallDto(
      (await prisma.call.findUnique({ where: { id }, include: callInclude }))!,
      user.id,
    );
  });

  /** Either side hangs up. Hanging up before an answer = a missed call for the other side. */
  app.post('/calls/:id/end', async (request): Promise<CallDto> => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    const call = await loadCall(id, user);
    if (call.status === 'RINGING') {
      await markMissed(call);
    } else if (call.status === 'ANSWERED') {
      await prisma.call.updateMany({
        where: { id, status: 'ANSWERED' },
        data: { status: 'ENDED', endedAt: ctx.now() },
      });
    }
    return toCallDto(
      (await prisma.call.findUnique({ where: { id }, include: callInclude }))!,
      user.id,
    );
  });

  /** Call history of a job (no audio is ever recorded). */
  app.get('/jobs/:id/calls', async (request): Promise<CallDto[]> => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    await loadJob(id, user);
    await expireRingingCalls(id);
    const calls = await prisma.call.findMany({
      where: { jobId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: callInclude,
    });
    return calls.map((c) => toCallDto(c, user.id));
  });
}
