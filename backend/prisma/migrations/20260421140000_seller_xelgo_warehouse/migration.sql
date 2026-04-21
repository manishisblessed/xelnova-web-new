-- Per-seller pickup warehouse for Ship-with-Xelnova (Xelgo).
-- Each seller's address is auto-registered with the platform's master
-- Delhivery account so the rider routes to the seller's location
-- instead of OPULENCE TRADER's master warehouse.

ALTER TABLE "seller_profiles"
  ADD COLUMN IF NOT EXISTS "xelgoWarehouseName"              TEXT,
  ADD COLUMN IF NOT EXISTS "xelgoWarehouseRegisteredAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "xelgoWarehouseRegistrationError" TEXT,
  ADD COLUMN IF NOT EXISTS "xelgoWarehouseSnapshotHash"      TEXT;
