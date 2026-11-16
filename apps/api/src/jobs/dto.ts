import type { JobDto, MasterCard, PriceChangeDto } from '@usta/shared';
import type {
  GuaranteeClaim,
  Job,
  MasterProfile,
  Offer,
  PriceChange,
  User,
} from '../generated/prisma/client';
import { requestInclude, toRequestDto, type RequestWithRelations } from '../requests/dto';
import type { FileStorage } from '../storage/storage';
import { reviewInclude, toClaimDto, toReviewDto, type ReviewWithRelations } from '../trust/dto';

type MasterWithProfile = User & { masterProfile: MasterProfile | null };

export async function toMasterCard(
  master: MasterWithProfile,
  storage: FileStorage,
  publicEndpoint: string,
): Promise<MasterCard> {
  const p = master.masterProfile;
  return {
    id: master.id,
    name: master.name,
    photoUrl: p?.photoKey ? await storage.presignDownload(p.photoKey, publicEndpoint) : null,
    ratingAvg: p?.ratingAvg ?? 0,
    ratingCount: p?.ratingCount ?? 0,
    completedJobsCount: p?.completedJobsCount ?? 0,
    verified: p?.verificationStatus === 'VERIFIED',
  };
}

export const toPriceChangeDto = (pc: PriceChange): PriceChangeDto => ({
  id: pc.id,
  newPrice: pc.newPrice,
  reason: pc.reason,
  status: pc.status,
  createdAt: pc.createdAt.toISOString(),
});

export const jobInclude = {
  request: { include: requestInclude },
  offer: true,
  customer: true,
  master: { include: { masterProfile: true } },
  priceChanges: { orderBy: { createdAt: 'asc' } },
  review: { include: reviewInclude },
  guaranteeClaims: { orderBy: { createdAt: 'asc' } },
} as const;

export type JobWithRelations = Job & {
  request: RequestWithRelations;
  offer: Offer;
  customer: User;
  master: MasterWithProfile;
  priceChanges: PriceChange[];
  review: ReviewWithRelations | null;
  guaranteeClaims: GuaranteeClaim[];
};

/** Price to pay now: the last approved change, otherwise the agreed price. */
export function currentPrice(job: { agreedPrice: number; priceChanges: PriceChange[] }): number {
  const approved = job.priceChanges.filter((pc) => pc.status === 'APPROVED');
  return approved.at(-1)?.newPrice ?? job.agreedPrice;
}

export async function toJobDto(
  job: JobWithRelations,
  viewerId: string,
  storage: FileStorage,
  publicEndpoint: string,
  now: Date,
): Promise<JobDto> {
  const iso = (d: Date | null) => d?.toISOString() ?? null;
  const pending = job.priceChanges.find((pc) => pc.status === 'PENDING') ?? null;
  const isCustomer = job.customerId === viewerId;
  const isDone = job.status === 'DONE';
  const inGuarantee = job.guaranteeUntil !== null && job.guaranteeUntil > now;
  const hasOpenClaim = job.guaranteeClaims.some((c) => c.status === 'OPEN');
  return {
    id: job.id,
    status: job.status,
    myRole: job.masterId === viewerId ? 'MASTER' : 'CUSTOMER',
    agreedPrice: job.agreedPrice,
    currentPrice: currentPrice(job),
    finalPrice: job.finalPrice,
    arrivalAt: job.offer.arrivalAt.toISOString(),
    onTheWayEtaMinutes: job.onTheWayEtaMinutes,
    acceptedAt: job.acceptedAt.toISOString(),
    onTheWayAt: iso(job.onTheWayAt),
    startedAt: iso(job.startedAt),
    doneAt: iso(job.doneAt),
    cancelledAt: iso(job.cancelledAt),
    cancelledByMe: job.cancelledById === viewerId,
    guaranteeUntil: iso(job.guaranteeUntil),
    // After the offer is accepted both sides see the address and each other's phone.
    request: await toRequestDto(job.request, storage, publicEndpoint, { revealAddress: true }),
    master: {
      ...(await toMasterCard(job.master, storage, publicEndpoint)),
      phone: job.master.phone,
    },
    customer: { name: job.customer.name, phone: job.customer.phone },
    pendingPriceChange: pending ? toPriceChangeDto(pending) : null,
    priceChanges: job.priceChanges.map(toPriceChangeDto),
    review: job.review ? await toReviewDto(job.review, storage, publicEndpoint) : null,
    guaranteeClaims: job.guaranteeClaims.map(toClaimDto),
    canReview: isCustomer && isDone && !job.review,
    canClaimGuarantee: isCustomer && isDone && inGuarantee && !hasOpenClaim,
  };
}
