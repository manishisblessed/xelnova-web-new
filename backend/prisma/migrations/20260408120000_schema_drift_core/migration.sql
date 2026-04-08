-- Align core tables and enums with prisma/schema.prisma (additive, idempotent where possible).
-- Apply with: cd backend && npx prisma migrate deploy

-- ─── AuthProvider + users ───
DO $authprovider$ BEGIN
  CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'PHONE', 'GOOGLE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $authprovider$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "authProvider" "AuthProvider" NOT NULL DEFAULT 'EMAIL';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "adminRoleId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetExpires" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "users_passwordResetToken_key" ON "users"("passwordResetToken");

-- ─── products (catalog queries select these scalars) ───
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "metaTitle" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "metaDescription" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "hsnCode" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "gstRate" DOUBLE PRECISION;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "lowStockThreshold" INTEGER NOT NULL DEFAULT 5;

-- ─── brands ───
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "proposedBy" TEXT;
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "approved" BOOLEAN NOT NULL DEFAULT true;

-- ─── seller_profiles (includes on products load full row) ───
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "panVerifiedData" JSONB;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "maskedAadhaarUrl" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "aadhaarNumber" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "aadhaarVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "aadhaarVerifiedAt" TIMESTAMP(3);
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "aadhaarVerifiedData" JSONB;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "signatureUrl" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "signatureData" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "signatureVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "signatureVerifiedAt" TIMESTAMP(3);
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "signatureVerifiedBy" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "signatureRejectionNote" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "categorySelectionType" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "selectedCategories" TEXT[] NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS "seller_profiles_email_key" ON "seller_profiles"("email");

-- ─── enums (duplicate-safe for re-runs / mixed PG versions) ───
DO $enum_ps$ BEGIN
  ALTER TYPE "ProductStatus" ADD VALUE 'ON_HOLD';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $enum_ps$;

DO $enum_doc$ BEGIN
  ALTER TYPE "DocumentType" ADD VALUE 'MASKED_AADHAAR';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $enum_doc$;

DO $enum_sig$ BEGIN
  ALTER TYPE "DocumentType" ADD VALUE 'SIGNATURE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $enum_sig$;
