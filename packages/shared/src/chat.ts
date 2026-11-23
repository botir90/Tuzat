import { z } from 'zod';

// ---------- Chat (design/screens/Chat.html) ----------

export const CHAT_MESSAGE_TYPES = ['TEXT', 'PHOTO', 'VOICE', 'SYSTEM'] as const;
export type ChatMessageType = (typeof CHAT_MESSAGE_TYPES)[number];

/**
 * Events the app writes into the chat itself. The phone shows them in its own language
 * using `params` (e.g. {"price":"120000"}).
 */
export const CHAT_SYSTEM_EVENTS = [
  'JOB_ACCEPTED',
  'ON_THE_WAY',
  'STARTED',
  'DONE',
  'CANCELLED',
  'PRICE_CHANGE_REQUESTED',
  'PRICE_APPROVED',
  'PRICE_DECLINED',
  'CALL_MISSED',
] as const;
export type ChatSystemEvent = (typeof CHAT_SYSTEM_EVENTS)[number];

export const MAX_CHAT_TEXT_LENGTH = 1000;
/** Messages returned per page. */
export const CHAT_PAGE_SIZE = 50;

export const sendChatMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('TEXT'), text: z.string().trim().min(1).max(MAX_CHAT_TEXT_LENGTH) }),
  z.object({ type: z.literal('PHOTO'), mediaKey: z.string().min(1) }),
  z.object({
    type: z.literal('VOICE'),
    mediaKey: z.string().min(1),
    durationMs: z
      .number()
      .int()
      .min(0)
      .max(10 * 60 * 1000),
  }),
]);
export type SendChatMessageBody = z.infer<typeof sendChatMessageSchema>;

export const chatMessageDtoSchema = z.object({
  id: z.string(),
  type: z.enum(CHAT_MESSAGE_TYPES),
  text: z.string().nullable(),
  /** Short-lived download link of a photo or voice message. */
  mediaUrl: z.string().nullable(),
  durationMs: z.number().int().nullable(),
  /** SYSTEM only. */
  event: z.enum(CHAT_SYSTEM_EVENTS).nullable(),
  params: z.record(z.string(), z.string()).nullable(),
  /** Sent by the user who is looking at the chat. */
  mine: z.boolean(),
  createdAt: z.string(),
});
export type ChatMessageDto = z.infer<typeof chatMessageDtoSchema>;

/** GET /jobs/:id/messages?after=<id>: new messages only (the app polls while the chat is open). */
export const chatMessagesQuerySchema = z.object({
  after: z.string().min(1).optional(),
});

// ---------- In-app calls (design/screens/Call.html) ----------

export const CALL_STATUSES = ['RINGING', 'ANSWERED', 'DECLINED', 'MISSED', 'ENDED'] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

/** A call that nobody answers stops ringing after this many seconds. */
export const CALL_RING_SECONDS = 45;

export const callDtoSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  status: z.enum(CALL_STATUSES),
  /** From the viewer's side. */
  direction: z.enum(['OUTGOING', 'INCOMING']),
  /** Name of the other side (phone numbers stay hidden). */
  otherName: z.string().nullable(),
  createdAt: z.string(),
  answeredAt: z.string().nullable(),
  endedAt: z.string().nullable(),
});
export type CallDto = z.infer<typeof callDtoSchema>;

/** What the phone needs to join the voice room. The token is short-lived. */
export const callJoinDtoSchema = z.object({
  call: callDtoSchema,
  livekitUrl: z.string(),
  token: z.string(),
});
export type CallJoinDto = z.infer<typeof callJoinDtoSchema>;
