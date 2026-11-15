import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  MAX_OPEN_REQUESTS_PER_CUSTOMER,
  MAX_SCHEDULE_DAYS,
  REQUEST_TTL_HOURS,
  UPLOAD_RULES,
  createRequestSchema,
  presignUploadSchema,
  type PresignUploadResponse,
  type RequestDto,
  type UploadKind,
} from '@usta/shared';
import { requireUser } from '../auth/authenticate';
import type { AppContext } from '../context';
import { AppError, conflict, notFound } from '../lib/errors';
import { publicStorageEndpoint } from '../storage/public-endpoint';
import { requestInclude, toRequestDto } from './dto';
import { expireOldRequests } from './expire';

const idParams = z.object({ id: z.string().min(1) });

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/mpeg': 'mp3',
};

/** Every upload lives under the uploader's folder, so nobody can attach someone else's file. */
const uploadPrefix = (userId: string, kind: UploadKind) => `uploads/${userId}/${kind}/`;

export function registerRequestRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { prisma, storage } = ctx;

  /** Step 1 of a file upload: get a URL to PUT the file to. */
  app.post('/uploads/presign', async (request): Promise<PresignUploadResponse> => {
    const user = await requireUser(ctx, request);
    const { kind, contentType } = presignUploadSchema.parse(request.body);
    const key = `${uploadPrefix(user.id, kind)}${randomUUID()}.${EXTENSIONS[contentType] ?? 'bin'}`;
    const uploadUrl = await storage.presignUpload(
      key,
      contentType,
      publicStorageEndpoint(ctx.env, request),
    );
    return { key, uploadUrl, headers: { 'Content-Type': contentType } };
  });

  /** Checks that a key belongs to this user, exists, and is not too big. */
  async function checkUpload(userId: string, kind: UploadKind, key: string): Promise<void> {
    if (!key.startsWith(uploadPrefix(userId, kind))) throw new AppError('UPLOAD_NOT_FOUND', 400);
    const info = await storage.head(key);
    if (!info || info.size === 0 || info.size > UPLOAD_RULES[kind].maxBytes) {
      throw new AppError('UPLOAD_NOT_FOUND', 400);
    }
  }

  app.post('/requests', async (request, reply) => {
    const user = await requireUser(ctx, request);
    const body = createRequestSchema.parse(request.body);
    const now = ctx.now();

    const [category, district] = await Promise.all([
      prisma.category.findUnique({ where: { id: body.categoryId } }),
      prisma.district.findUnique({ where: { id: body.districtId }, include: { region: true } }),
    ]);
    if (!category || !category.isActive || !district) throw notFound();
    if (!district.region.isActive) throw new AppError('REGION_NOT_ACTIVE', 400);

    let scheduledAt: Date | null = null;
    if (body.scheduledAt) {
      scheduledAt = new Date(body.scheduledAt);
      const latest = now.getTime() + MAX_SCHEDULE_DAYS * 86_400_000;
      if (scheduledAt.getTime() <= now.getTime() || scheduledAt.getTime() > latest) {
        throw new AppError('VALIDATION_ERROR', 400);
      }
    }

    // Business rule: at most 3 open requests per customer (stops spam and fake orders).
    await expireOldRequests(prisma, now);
    const openCount = await prisma.request.count({
      where: { customerId: user.id, status: 'OPEN' },
    });
    if (openCount >= MAX_OPEN_REQUESTS_PER_CUSTOMER) {
      throw new AppError('TOO_MANY_OPEN_REQUESTS', 400);
    }

    await Promise.all([
      ...body.photoKeys.map((key) => checkUpload(user.id, 'request-photo', key)),
      body.voiceKey ? checkUpload(user.id, 'request-voice', body.voiceKey) : undefined,
    ]);

    const created = await prisma.request.create({
      data: {
        customerId: user.id,
        categoryId: category.id,
        districtId: district.id,
        description: body.description || null,
        photoKeys: body.photoKeys,
        voiceKey: body.voiceKey ?? null,
        address: body.address,
        landmark: body.landmark || null,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        desiredTime: body.desiredTime,
        scheduledAt,
        createdAt: now,
        expiresAt: new Date(now.getTime() + REQUEST_TTL_HOURS * 3_600_000),
      },
      include: requestInclude,
    });

    const dto = await toRequestDto(created, storage, publicStorageEndpoint(ctx.env, request), {
      revealAddress: true,
    });
    return reply.code(201).send(dto);
  });

  /** "My requests", newest first. */
  app.get('/requests/mine', async (request): Promise<RequestDto[]> => {
    const user = await requireUser(ctx, request);
    await expireOldRequests(prisma, ctx.now());
    const rows = await prisma.request.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: requestInclude,
    });
    const endpoint = publicStorageEndpoint(ctx.env, request);
    return Promise.all(
      rows.map((row) => toRequestDto(row, storage, endpoint, { revealAddress: true })),
    );
  });

  app.get('/requests/:id', async (request): Promise<RequestDto> => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    await expireOldRequests(prisma, ctx.now());
    const row = await prisma.request.findUnique({ where: { id }, include: requestInclude });
    // Not your request → "not found" (don't reveal that it exists).
    if (!row || row.customerId !== user.id) throw notFound();
    return toRequestDto(row, storage, publicStorageEndpoint(ctx.env, request), {
      revealAddress: true,
    });
  });

  app.post('/requests/:id/cancel', async (request): Promise<RequestDto> => {
    const user = await requireUser(ctx, request);
    const { id } = idParams.parse(request.params);
    await expireOldRequests(prisma, ctx.now());
    const row = await prisma.request.findUnique({ where: { id } });
    if (!row || row.customerId !== user.id) throw notFound();
    if (row.status !== 'OPEN') throw conflict();

    const updated = await prisma.request.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: requestInclude,
    });
    return toRequestDto(updated, storage, publicStorageEndpoint(ctx.env, request), {
      revealAddress: true,
    });
  });
}
