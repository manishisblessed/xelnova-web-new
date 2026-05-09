-- Review moderation (replace boolean approved)
CREATE TYPE "ReviewModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "reviews" ADD COLUMN "moderationStatus" "ReviewModerationStatus";

UPDATE "reviews"
SET "moderationStatus" = CASE
  WHEN "approved" = true THEN 'APPROVED'::"ReviewModerationStatus"
  ELSE 'PENDING'::"ReviewModerationStatus"
END;

ALTER TABLE "reviews" ALTER COLUMN "moderationStatus" SET NOT NULL;
ALTER TABLE "reviews" ALTER COLUMN "moderationStatus" SET DEFAULT 'PENDING'::"ReviewModerationStatus";

DROP INDEX IF EXISTS "reviews_approved_idx";
ALTER TABLE "reviews" DROP COLUMN "approved";

ALTER TABLE "reviews" ADD COLUMN "moderatedAt" TIMESTAMP(3);
ALTER TABLE "reviews" ADD COLUMN "moderatedById" TEXT;
ALTER TABLE "reviews" ADD COLUMN "moderationNote" TEXT;

CREATE INDEX "reviews_moderationStatus_idx" ON "reviews"("moderationStatus");

-- Coupon moderation (seller-created coupons go through admin approval)
CREATE TYPE "CouponModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "coupons" ADD COLUMN "moderationStatus" "CouponModerationStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "coupons" ADD COLUMN "moderatedAt" TIMESTAMP(3);
ALTER TABLE "coupons" ADD COLUMN "moderatedById" TEXT;
ALTER TABLE "coupons" ADD COLUMN "rejectionReason" TEXT;

CREATE INDEX "coupons_moderationStatus_idx" ON "coupons"("moderationStatus");

-- Product return preset + structured warranty (optional)
CREATE TYPE "ProductReturnPolicyPreset" AS ENUM (
  'NON_RETURNABLE',
  'EASY_RETURN_3_DAYS',
  'EASY_RETURN_7_DAYS',
  'REPLACEMENT_ONLY',
  'RETURN_PLUS_REPLACEMENT'
);

CREATE TYPE "WarrantyDurationUnit" AS ENUM ('DAYS', 'MONTHS', 'YEARS');

ALTER TABLE "products" ADD COLUMN "returnPolicyPreset" "ProductReturnPolicyPreset";
ALTER TABLE "products" ADD COLUMN "warrantyDurationValue" INTEGER;
ALTER TABLE "products" ADD COLUMN "warrantyDurationUnit" "WarrantyDurationUnit";

-- Support ticket workflow
ALTER TYPE "TicketStatus" ADD VALUE 'FORWARDED';
ALTER TYPE "TicketStatus" ADD VALUE 'SELLER_REPLIED';

ALTER TABLE "tickets" ADD COLUMN "forwardedAt" TIMESTAMP(3);

ALTER TABLE "ticket_messages" ADD COLUMN "customerVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ticket_messages" ADD COLUMN "sellerVisible" BOOLEAN NOT NULL DEFAULT true;

-- Moderation audit trail
CREATE TABLE "moderation_audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "moderation_audit_logs_entityType_entityId_idx" ON "moderation_audit_logs"("entityType", "entityId");
CREATE INDEX "moderation_audit_logs_createdAt_idx" ON "moderation_audit_logs"("createdAt");
