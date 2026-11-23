import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  adminClaimsQuerySchema,
  adminComplaintsQuerySchema,
  adminRequestsQuerySchema,
  resolveClaimSchema,
  resolveComplaintSchema,
  type AdminCaseRow,
  type AdminPage,
  type AdminRequestRow,
  type AdminStats,
  type AdminWaitlistRow,
} from '@usta/shared';
import type { AppContext } from '../context';
import { currentPrice } from '../jobs/dto';
import { conflict, notFound } from '../lib/errors';
import { requireAdmin } from './auth';
import { pageArgs, toPage } from './paging';

const idParams = z.object({ id: z.string().min(1) });

/** Everything needed to show which job a claim or complaint is about. */
const caseJobInclude = {
  job: {
    include: {
      customer: { select: { phone: true } },
      master: { select: { name: true, phone: true } },
      request: { select: { category: { select: { nameUzLatn: true } } } },
    },
  },
} as const;

/** Admin panel language is Uzbek. */
const COMPLAINT_REASON_UZ: Record<string, string> = {
  NOT_FIXED: 'Muammo tuzalmadi',
  POOR_QUALITY: 'Ish sifatsiz bajarildi',
  ASKED_MORE_MONEY: "Usta ko'p pul so'radi",
  OTHER: 'Boshqa sabab',
};

/** "[Reason] text (2 ta rasm, ovozli xabar)" for the cases table. */
function complaintSummary(c: {
  reason: string | null;
  text: string;
  photoKeys: string[];
  voiceKey: string | null;
}): string {
  const attachments = [
    c.photoKeys.length > 0 ? `${c.photoKeys.length} ta rasm` : null,
    c.voiceKey ? 'ovozli xabar' : null,
  ].filter(Boolean);
  return [
    c.reason ? `[${COMPLAINT_REASON_UZ[c.reason] ?? c.reason}]` : null,
    c.text || null,
    attachments.length > 0 ? `(${attachments.join(', ')})` : null,
  ]
    .filter(Boolean)
    .join(' ');
}

/** Orders overview, guarantee claims, complaints, waitlist and the dashboard numbers. */
export function registerAdminCaseRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { prisma } = ctx;

  app.get('/admin/stats', async (request): Promise<AdminStats> => {
    await requireAdmin(ctx, request);
    const [pendingMasters, openRequests, activeJobs, openClaims, openComplaints, waitlist] =
      await Promise.all([
        prisma.masterProfile.count({ where: { verificationStatus: 'PENDING' } }),
        prisma.request.count({ where: { status: 'OPEN', expiresAt: { gt: ctx.now() } } }),
        prisma.job.count({ where: { status: { in: ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS'] } } }),
        prisma.guaranteeClaim.count({ where: { status: 'OPEN' } }),
        prisma.complaint.count({ where: { status: 'OPEN' } }),
        prisma.waitlistEntry.count(),
      ]);
    return { pendingMasters, openRequests, activeJobs, openClaims, openComplaints, waitlist };
  });

  app.get('/admin/requests', async (request): Promise<AdminPage<AdminRequestRow>> => {
    await requireAdmin(ctx, request);
    const { status, cursor, limit } = adminRequestsQuerySchema.parse(request.query);
    const rows = await prisma.request.findMany({
      where: status ? { status } : {},
      ...pageArgs(cursor, limit),
      include: {
        category: true,
        district: { include: { region: true } },
        customer: { select: { phone: true } },
        _count: { select: { offers: true } },
        job: { include: { master: { select: { name: true } }, priceChanges: true } },
      },
    });
    return toPage(
      rows,
      limit,
      (r) => ({
        id: r.id,
        status: r.status,
        category: r.category.nameUzLatn,
        district: r.district.nameUzLatn,
        region: r.district.region.nameUzLatn,
        customerPhone: r.customer.phone,
        description: r.description,
        offerCount: r._count.offers,
        job: r.job
          ? {
              id: r.job.id,
              status: r.job.status,
              masterName: r.job.master.name,
              price: r.job.finalPrice ?? currentPrice(r.job),
            }
          : null,
        createdAt: r.createdAt.toISOString(),
      }),
      (r) => r.id,
    );
  });

  app.get('/admin/claims', async (request): Promise<AdminPage<AdminCaseRow>> => {
    await requireAdmin(ctx, request);
    const { status, cursor, limit } = adminClaimsQuerySchema.parse(request.query);
    const rows = await prisma.guaranteeClaim.findMany({
      where: status ? { status } : {},
      ...pageArgs(cursor, limit),
      include: caseJobInclude,
    });
    return toPage(
      rows,
      limit,
      (c) => ({
        id: c.id,
        text: c.description,
        status: c.status,
        adminNote: c.adminNote,
        jobId: c.jobId,
        category: c.job.request.category.nameUzLatn,
        customerPhone: c.job.customer.phone,
        masterName: c.job.master.name,
        masterPhone: c.job.master.phone,
        fromPhone: null,
        createdAt: c.createdAt.toISOString(),
        resolvedAt: c.resolvedAt?.toISOString() ?? null,
      }),
      (c) => c.id,
    );
  });

  app.post('/admin/claims/:id/resolve', async (request, reply) => {
    await requireAdmin(ctx, request);
    const { id } = idParams.parse(request.params);
    const { status, adminNote } = resolveClaimSchema.parse(request.body);
    const claim = await prisma.guaranteeClaim.findUnique({ where: { id } });
    if (!claim) throw notFound();
    if (claim.status !== 'OPEN') throw conflict();
    await prisma.guaranteeClaim.update({
      where: { id },
      data: { status, adminNote: adminNote || null, resolvedAt: ctx.now() },
    });
    return reply.code(204).send();
  });

  app.get('/admin/complaints', async (request): Promise<AdminPage<AdminCaseRow>> => {
    await requireAdmin(ctx, request);
    const { status, cursor, limit } = adminComplaintsQuerySchema.parse(request.query);
    const rows = await prisma.complaint.findMany({
      where: status ? { status } : {},
      ...pageArgs(cursor, limit),
      include: { ...caseJobInclude, fromUser: { select: { phone: true } } },
    });
    return toPage(
      rows,
      limit,
      (c) => ({
        id: c.id,
        text: complaintSummary(c),
        status: c.status,
        adminNote: c.adminNote,
        jobId: c.jobId,
        category: c.job.request.category.nameUzLatn,
        customerPhone: c.job.customer.phone,
        masterName: c.job.master.name,
        masterPhone: c.job.master.phone,
        fromPhone: c.fromUser.phone,
        createdAt: c.createdAt.toISOString(),
        resolvedAt: c.resolvedAt?.toISOString() ?? null,
      }),
      (c) => c.id,
    );
  });

  app.post('/admin/complaints/:id/resolve', async (request, reply) => {
    await requireAdmin(ctx, request);
    const { id } = idParams.parse(request.params);
    const { adminNote } = resolveComplaintSchema.parse(request.body);
    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw notFound();
    if (complaint.status !== 'OPEN') throw conflict();
    await prisma.complaint.update({
      where: { id },
      data: { status: 'RESOLVED', adminNote: adminNote || null, resolvedAt: ctx.now() },
    });
    return reply.code(204).send();
  });

  /** Demand data: where people want masters but we have none yet. Biggest first. */
  app.get('/admin/waitlist', async (request): Promise<AdminWaitlistRow[]> => {
    await requireAdmin(ctx, request);
    const groups = await prisma.waitlistEntry.groupBy({
      by: ['regionId', 'districtId', 'categoryId'],
      _count: { _all: true },
    });
    const [regions, districts, categories] = await Promise.all([
      prisma.region.findMany({ select: { id: true, nameUzLatn: true } }),
      prisma.district.findMany({ select: { id: true, nameUzLatn: true } }),
      prisma.category.findMany({ select: { id: true, nameUzLatn: true } }),
    ]);
    const nameOf = (list: { id: string; nameUzLatn: string }[], id: string | null) =>
      id ? (list.find((x) => x.id === id)?.nameUzLatn ?? null) : null;
    return groups
      .map((g) => ({
        region: nameOf(regions, g.regionId) ?? '—',
        district: nameOf(districts, g.districtId),
        category: nameOf(categories, g.categoryId),
        count: g._count._all,
      }))
      .sort((a, b) => b.count - a.count);
  });
}
