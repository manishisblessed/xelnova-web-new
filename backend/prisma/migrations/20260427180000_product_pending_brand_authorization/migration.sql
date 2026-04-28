-- AlterEnum (run once)
ALTER TYPE "ProductStatus" ADD VALUE 'PENDING_BRAND_AUTHORIZATION';

-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "brandAuthAdditionalDocumentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
