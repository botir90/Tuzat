-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CLICK', 'PAYME');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CASH', 'PENDING', 'HELD', 'FROZEN', 'RELEASED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HoldKind" AS ENUM ('LABOR', 'PARTS', 'EXTRA');

-- CreateEnum
CREATE TYPE "HoldStatus" AS ENUM ('HELD', 'RELEASED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'RELEASED', 'REFUNDED', 'SPLIT');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "BalanceEntryKind" AS ENUM ('CASH_COMMISSION', 'SETTLEMENT');

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "partsPrice" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CASH',
    "provider" TEXT,
    "providerRef" TEXT,
    "releaseDueAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heldAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hold" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "kind" "HoldKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "HoldStatus" NOT NULL DEFAULT 'HELD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "Hold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartsReceipt" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "photoKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "PartsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "complaintId" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "masterAmount" INTEGER,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "commission" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterBalance" (
    "masterId" TEXT NOT NULL,
    "owed" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterBalance_pkey" PRIMARY KEY ("masterId")
);

-- CreateTable
CREATE TABLE "BalanceEntry" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "jobId" TEXT,
    "kind" "BalanceEntryKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_jobId_key" ON "Payment"("jobId");

-- CreateIndex
CREATE INDEX "Payment_status_releaseDueAt_idx" ON "Payment"("status", "releaseDueAt");

-- CreateIndex
CREATE INDEX "Hold_paymentId_idx" ON "Hold"("paymentId");

-- CreateIndex
CREATE INDEX "PartsReceipt_jobId_idx" ON "PartsReceipt"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_jobId_key" ON "Dispute"("jobId");

-- CreateIndex
CREATE INDEX "Dispute_status_createdAt_idx" ON "Dispute"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Payout_masterId_createdAt_idx" ON "Payout"("masterId", "createdAt");

-- CreateIndex
CREATE INDEX "BalanceEntry_masterId_createdAt_idx" ON "BalanceEntry"("masterId", "createdAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hold" ADD CONSTRAINT "Hold_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartsReceipt" ADD CONSTRAINT "PartsReceipt_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterBalance" ADD CONSTRAINT "MasterBalance_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceEntry" ADD CONSTRAINT "BalanceEntry_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
