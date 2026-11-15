-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PriceChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "agreedPrice" INTEGER NOT NULL,
    "finalPrice" INTEGER,
    "status" "JobStatus" NOT NULL DEFAULT 'ACCEPTED',
    "onTheWayEtaMinutes" INTEGER,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "onTheWayAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancelReason" TEXT,
    "guaranteeUntil" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceChange" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "newPrice" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "PriceChangeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "PriceChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_requestId_key" ON "Job"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_offerId_key" ON "Job"("offerId");

-- CreateIndex
CREATE INDEX "Job_customerId_status_idx" ON "Job"("customerId", "status");

-- CreateIndex
CREATE INDEX "Job_masterId_status_idx" ON "Job"("masterId", "status");

-- CreateIndex
CREATE INDEX "PriceChange_jobId_status_idx" ON "PriceChange"("jobId", "status");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceChange" ADD CONSTRAINT "PriceChange_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
