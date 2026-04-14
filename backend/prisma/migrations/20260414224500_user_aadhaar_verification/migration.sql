-- Add Aadhaar verification fields to users table for wallet access
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aadhaarVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aadhaarVerifiedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aadhaarVerifiedData" JSONB;
