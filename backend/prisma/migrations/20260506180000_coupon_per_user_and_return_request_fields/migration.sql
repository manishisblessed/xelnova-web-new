-- Per-user coupon cap (null = no extra limit beyond global usageLimit)
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "maxRedemptionsPerUser" INTEGER;

-- Return request enrichment
CREATE TYPE "ReturnRequestKind" AS ENUM ('RETURN', 'REPLACEMENT');

ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "kind" "ReturnRequestKind" NOT NULL DEFAULT 'RETURN';
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "reasonCode" TEXT;
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
