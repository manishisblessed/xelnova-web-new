-- ─── Add ON_HOLD to PayoutStatus enum ───
ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'ON_HOLD' BEFORE 'PENDING';

-- ─── Add Xelgo service fee + return-leg fields to Shipment ───
ALTER TABLE "shipments"
  ADD COLUMN IF NOT EXISTS "xelgoServiceCharge"       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "returnCourierCharges"     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "returnXelgoServiceCharge" DOUBLE PRECISION;

-- ─── Add hold/release + snapshot columns to Payout ───
ALTER TABLE "payouts"
  ADD COLUMN IF NOT EXISTS "holdUntil"          TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "releasedAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "gross"              DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "commission"         DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "xelgoServiceCharge" DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "payouts_holdUntil_idx" ON "payouts"("holdUntil");

-- ─── Extend WalletReferenceType enum ───
ALTER TYPE "WalletReferenceType" ADD VALUE IF NOT EXISTS 'XELGO_SERVICE_FEE';
ALTER TYPE "WalletReferenceType" ADD VALUE IF NOT EXISTS 'RETURN_REVERSAL';
ALTER TYPE "WalletReferenceType" ADD VALUE IF NOT EXISTS 'RETURN_SHIPPING';

-- ─── Holiday calendar (Sunday + these dates = non-business day) ───
CREATE TABLE IF NOT EXISTS "holidays" (
    "id"        TEXT NOT NULL,
    "date"      DATE NOT NULL,
    "name"      TEXT NOT NULL,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "holidays_date_key" ON "holidays"("date");
CREATE INDEX        IF NOT EXISTS "holidays_date_idx" ON "holidays"("date");
