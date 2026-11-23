-- CreateEnum
CREATE TYPE "BonusKind" AS ENUM ('CASHBACK', 'REVIEW_PHOTO', 'REFERRAL', 'SPENT', 'REFUND');

-- AlterEnum
ALTER TYPE "BalanceEntryKind" ADD VALUE 'DISCOUNT_CREDIT';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "bonusUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "promoCodeId" TEXT,
ADD COLUMN     "promoDiscount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredById" TEXT;

-- CreateTable
CREATE TABLE "BonusEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "BonusKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "jobId" TEXT,
    "sourceUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BonusEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "titleUzLatn" TEXT NOT NULL,
    "titleUzCyrl" TEXT NOT NULL,
    "titleRu" TEXT NOT NULL,
    "percent" INTEGER,
    "amount" INTEGER,
    "maxDiscount" INTEGER,
    "firstOrderOnly" BOOLEAN NOT NULL DEFAULT false,
    "showOnHome" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoRedemption" (
    "id" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "discount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BonusEntry_userId_createdAt_idx" ON "BonusEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BonusEntry_kind_sourceUserId_idx" ON "BonusEntry"("kind", "sourceUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PromoRedemption_promoCodeId_userId_key" ON "PromoRedemption"("promoCodeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "BonusEntry" ADD CONSTRAINT "BonusEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

