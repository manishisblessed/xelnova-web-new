-- AlterTable: Add tax and invoice fields to order_items
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "hsnCode" TEXT;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "gstRate" DOUBLE PRECISION DEFAULT 18;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "imeiSerialNo" TEXT;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "sellerId" TEXT;
