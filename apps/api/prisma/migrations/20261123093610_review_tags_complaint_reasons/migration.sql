-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "photoKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "voiceKey" TEXT;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
