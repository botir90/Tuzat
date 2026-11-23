import { z } from 'zod';

// ---------- Payments (CLAUDE.md 7a; design: Payment, ConfirmJob, MasterPayout) ----------

export const PAYMENT_METHODS = ['CASH', 'CLICK', 'PAYME'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const ONLINE_METHODS = ['CLICK', 'PAYME'] as const;

export const PAYMENT_STATUSES = [
  'CASH',
  'PENDING',
  'HELD',
  'FROZEN',
  'RELEASED',
  'REFUNDED',
  'CANCELLED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const RECEIPT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

export const DISPUTE_STATUSES = ['OPEN', 'RELEASED', 'REFUNDED', 'SPLIT'] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

/** Hours the customer has to confirm or complain before held money goes to the master. */
export const AUTO_RELEASE_HOURS = 24;

export const choosePaymentSchema = z.object({ method: z.enum(PAYMENT_METHODS) });
export type ChoosePaymentBody = z.infer<typeof choosePaymentSchema>;

export const createPartsReceiptSchema = z.object({
  photoKey: z.string().min(1),
  description: z.string().trim().min(2).max(200),
  amount: z.number().int().min(1000).max(100_000_000),
});
export type CreatePartsReceiptBody = z.infer<typeof createPartsReceiptSchema>;

export const partsReceiptDtoSchema = z.object({
  id: z.string(),
  photoUrl: z.string(),
  description: z.string(),
  amount: z.number().int(),
  status: z.enum(RECEIPT_STATUSES),
  createdAt: z.string(),
});
export type PartsReceiptDto = z.infer<typeof partsReceiptDtoSchema>;

/** The money of one job, as the customer or the master sees it. */
export const paymentDtoSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  status: z.enum(PAYMENT_STATUSES),
  /** Online payments can be chosen (feature flag + provider ready). */
  onlineAvailable: z.boolean(),
  /** The price now (agreed + approved changes). */
  total: z.number().int(),
  labor: z.number().int(),
  /** Parts expected in the offer. */
  partsEstimate: z.number().int(),
  /** Online: what the provider holds right now. */
  held: z.number().int(),
  /** Platform commission of this job (0 during the master's free months). */
  commission: z.number().int(),
  commissionPercent: z.number(),
  /** What the master gets in the end (total − commission). */
  masterGets: z.number().int(),
  /** Online, after the master finished: when the money goes to the master by itself. */
  releaseDueAt: z.string().nullable(),
  /** Customer only: the job is finished and the held money waits for the "Job done" tap. */
  canConfirm: z.boolean(),
  disputeOpen: z.boolean(),
  receipts: z.array(partsReceiptDtoSchema),
});
export type PaymentDto = z.infer<typeof paymentDtoSchema>;

/** The master's debt to the platform (commission of cash jobs). */
export const masterBalanceDtoSchema = z.object({
  owed: z.number().int(),
  commissionPercent: z.number(),
  /** Until this date the master pays no commission (first months free). */
  freeUntil: z.string().nullable(),
  entries: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(['CASH_COMMISSION', 'SETTLEMENT']),
      amount: z.number().int(),
      jobId: z.string().nullable(),
      note: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});
export type MasterBalanceDto = z.infer<typeof masterBalanceDtoSchema>;

// ---------- Admin ----------

export const resolveDisputeSchema = z
  .object({
    decision: z.enum(['RELEASED', 'REFUNDED', 'SPLIT']),
    /** SPLIT only: what goes to the master (before commission). */
    masterAmount: z.number().int().min(0).optional(),
    note: z.string().trim().min(3).max(1000),
  })
  .refine((v) => v.decision !== 'SPLIT' || v.masterAmount !== undefined, {
    message: 'MASTER_AMOUNT_REQUIRED',
    path: ['masterAmount'],
  });
export type ResolveDisputeBody = z.infer<typeof resolveDisputeSchema>;

export const settleBalanceSchema = z.object({
  amount: z.number().int().min(1),
  note: z.string().trim().max(300).optional(),
});
export type SettleBalanceBody = z.infer<typeof settleBalanceSchema>;
