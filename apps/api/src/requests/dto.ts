import type { RequestDto } from '@usta/shared';
import type { Category, District, Region, Request } from '../generated/prisma/client';
import { names } from '../catalog/dto';
import type { FileStorage } from '../storage/storage';

export type RequestWithRelations = Request & {
  category: Category;
  district: District & { region: Region };
  _count?: { offers?: number };
};

/** Prisma "include" that loads everything toRequestDto needs. */
export const requestInclude = {
  category: true,
  district: { include: { region: true } },
} as const;

export async function toRequestDto(
  request: RequestWithRelations,
  storage: FileStorage,
  publicEndpoint: string,
  options: { revealAddress: boolean; offerCount?: number },
): Promise<RequestDto> {
  const [photoUrls, voiceUrl] = await Promise.all([
    Promise.all(request.photoKeys.map((key) => storage.presignDownload(key, publicEndpoint))),
    request.voiceKey ? storage.presignDownload(request.voiceKey, publicEndpoint) : null,
  ]);

  return {
    id: request.id,
    status: request.status,
    category: {
      id: request.category.id,
      name: names(request.category),
      icon: request.category.icon,
    },
    description: request.description,
    photoUrls,
    voiceUrl,
    district: { id: request.district.id, name: names(request.district) },
    region: { id: request.district.region.id, name: names(request.district.region) },
    // Privacy: masters see the exact address only after their offer is accepted.
    address: options.revealAddress ? request.address : null,
    landmark: options.revealAddress ? request.landmark : null,
    lat: options.revealAddress ? request.lat : null,
    lng: options.revealAddress ? request.lng : null,
    desiredTime: request.desiredTime,
    scheduledAt: request.scheduledAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
    expiresAt: request.expiresAt.toISOString(),
    offerCount: options.offerCount ?? request._count?.offers ?? 0,
  };
}
