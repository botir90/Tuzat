import { shortName, type ComplaintDto, type GuaranteeClaimDto, type ReviewDto } from '@usta/shared';
import { names } from '../catalog/dto';
import type { Category, Complaint, GuaranteeClaim, Review, User } from '../generated/prisma/client';
import type { FileStorage } from '../storage/storage';

export type ReviewWithRelations = Review & {
  customer: User;
  job: { request: { category: Category } };
};

/** Prisma "include" that loads everything toReviewDto needs. */
export const reviewInclude = {
  customer: true,
  job: { select: { request: { select: { category: true } } } },
} as const;

export async function toReviewDto(
  review: ReviewWithRelations,
  storage: FileStorage,
  publicEndpoint: string,
): Promise<ReviewDto> {
  return {
    id: review.id,
    stars: review.stars,
    comment: review.comment,
    photoUrls: await Promise.all(
      review.photoKeys.map((key) => storage.presignDownload(key, publicEndpoint)),
    ),
    customerName: shortName(review.customer.name),
    categoryName: names(review.job.request.category),
    createdAt: review.createdAt.toISOString(),
  };
}

export const toClaimDto = (claim: GuaranteeClaim): GuaranteeClaimDto => ({
  id: claim.id,
  description: claim.description,
  status: claim.status,
  adminNote: claim.adminNote,
  createdAt: claim.createdAt.toISOString(),
  resolvedAt: claim.resolvedAt?.toISOString() ?? null,
});

export const toComplaintDto = (complaint: Complaint): ComplaintDto => ({
  id: complaint.id,
  text: complaint.text,
  status: complaint.status,
  adminNote: complaint.adminNote,
  createdAt: complaint.createdAt.toISOString(),
  resolvedAt: complaint.resolvedAt?.toISOString() ?? null,
});
