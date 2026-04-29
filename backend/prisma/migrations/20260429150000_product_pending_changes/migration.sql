-- Add pending changes tracking to products
-- When a seller edits an ACTIVE product, changes are stored here for admin review
-- Product remains visible on web with original content until admin approves

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "hasPendingChanges" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "pendingChangesData" JSONB;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "pendingChangesSubmittedAt" TIMESTAMP(3);

-- Index for admin to query products with pending changes
CREATE INDEX IF NOT EXISTS "products_hasPendingChanges_idx" ON "products" ("hasPendingChanges");

COMMENT ON COLUMN "products"."hasPendingChanges" IS 'True when seller has submitted changes to an ACTIVE product awaiting admin approval';
COMMENT ON COLUMN "products"."pendingChangesData" IS 'JSON containing the proposed changes (only modified fields) for admin review';
COMMENT ON COLUMN "products"."pendingChangesSubmittedAt" IS 'Timestamp when the seller submitted the pending changes';
