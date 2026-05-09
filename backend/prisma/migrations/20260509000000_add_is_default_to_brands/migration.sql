-- Adds:
--   * brands.isDefault  — when true, this brand doesn't require authorization certificates (e.g., Generic brand)
--
-- Sellers can use default brands to add generic products without needing brand authorization documents.

ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;
