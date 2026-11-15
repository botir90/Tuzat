import type { MasterProfileDto, OfferDto } from '@usta/shared';
import type { Category, District, MasterProfile, Offer, User } from '../generated/prisma/client';
import { names } from '../catalog/dto';
import type { FileStorage } from '../storage/storage';

export type ProfileWithRelations = MasterProfile & {
  user: User;
  categories: Category[];
  districts: District[];
};

export const profileInclude = { user: true, categories: true, districts: true } as const;

export async function toMasterProfileDto(
  profile: ProfileWithRelations,
  storage: FileStorage,
  publicEndpoint: string,
): Promise<MasterProfileDto> {
  return {
    name: profile.user.name,
    photoKey: profile.photoKey,
    photoUrl: profile.photoKey
      ? await storage.presignDownload(profile.photoKey, publicEndpoint)
      : null,
    bio: profile.bio,
    verificationStatus: profile.verificationStatus,
    rejectionReason: profile.rejectionReason,
    isAvailable: profile.isAvailable,
    ratingAvg: profile.ratingAvg,
    ratingCount: profile.ratingCount,
    completedJobsCount: profile.completedJobsCount,
    categories: profile.categories.map((c) => ({ id: c.id, name: names(c) })),
    districts: profile.districts.map((d) => ({ id: d.id, regionId: d.regionId, name: names(d) })),
    workPhotos: await Promise.all(
      profile.workPhotoKeys.map(async (key) => ({
        key,
        url: await storage.presignDownload(key, publicEndpoint),
      })),
    ),
  };
}

export const toOfferDto = (offer: Offer): OfferDto => ({
  id: offer.id,
  requestId: offer.requestId,
  price: offer.price,
  arrivalAt: offer.arrivalAt.toISOString(),
  message: offer.message,
  status: offer.status,
  createdAt: offer.createdAt.toISOString(),
});
