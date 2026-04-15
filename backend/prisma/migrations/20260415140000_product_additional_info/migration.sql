-- Add Amazon-style product information fields
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "featuresAndSpecs" JSONB;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "materialsAndCare" JSONB;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "itemDetails" JSONB;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "additionalDetails" JSONB;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "productDescription" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "safetyInfo" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "regulatoryInfo" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "warrantyInfo" VARCHAR(255);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "deliveredBy" VARCHAR(255) DEFAULT 'Xelnova';
