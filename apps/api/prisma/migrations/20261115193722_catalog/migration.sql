-- CreateEnum
CREATE TYPE "DistrictType" AS ENUM ('DISTRICT', 'CITY');

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameUzLatn" TEXT NOT NULL,
    "nameUzCyrl" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "type" "DistrictType" NOT NULL DEFAULT 'DISTRICT',
    "nameUzLatn" TEXT NOT NULL,
    "nameUzCyrl" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameUzLatn" TEXT NOT NULL,
    "nameUzCyrl" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceItem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "nameUzLatn" TEXT NOT NULL,
    "nameUzCyrl" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "minPrice" INTEGER NOT NULL,
    "maxPrice" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PriceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionPrice" (
    "id" TEXT NOT NULL,
    "priceItemId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "minPrice" INTEGER NOT NULL,
    "maxPrice" INTEGER NOT NULL,

    CONSTRAINT "RegionPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "districtId" TEXT,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Region_slug_key" ON "Region"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "District_slug_key" ON "District"("slug");

-- CreateIndex
CREATE INDEX "District_regionId_idx" ON "District"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PriceItem_slug_key" ON "PriceItem"("slug");

-- CreateIndex
CREATE INDEX "PriceItem_categoryId_idx" ON "PriceItem"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "RegionPrice_priceItemId_regionId_key" ON "RegionPrice"("priceItemId", "regionId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_regionId_idx" ON "WaitlistEntry"("regionId");

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceItem" ADD CONSTRAINT "PriceItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionPrice" ADD CONSTRAINT "RegionPrice_priceItemId_fkey" FOREIGN KEY ("priceItemId") REFERENCES "PriceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionPrice" ADD CONSTRAINT "RegionPrice_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
