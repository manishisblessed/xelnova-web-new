-- Adds:
--   * products.imageRejectionReason       — separate reason for rejecting only product images
--   * brands.authorizationCertificate     — URL of the seller-uploaded brand authorisation certificate
--   * brands.rejectionReason              — admin note when rejecting a proposed brand
--   * supporting indexes on brands.proposedBy / brands.approved for the
--     "Pending brands" admin view.

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "imageRejectionReason" TEXT;

ALTER TABLE "brands"
  ADD COLUMN IF NOT EXISTS "authorizationCertificate" TEXT,
  ADD COLUMN IF NOT EXISTS "rejectionReason"          TEXT;

CREATE INDEX IF NOT EXISTS "brands_proposedBy_idx" ON "brands" ("proposedBy");
CREATE INDEX IF NOT EXISTS "brands_approved_idx"   ON "brands" ("approved");
