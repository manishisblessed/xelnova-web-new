-- Align payouts table with prisma Payout (split payments / advance payouts)

ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "razorpayTransferId" TEXT;
ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "isAdvance" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "orderId" TEXT;
