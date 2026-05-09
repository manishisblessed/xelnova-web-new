-- Admin-controlled per-product replacement window (in days). Set on approval
-- alongside the existing isReplaceable flag. Currently the admin picks between
-- 2, 5, or 7 days but we store the raw integer so the policy can evolve
-- without another migration. NULL means "not explicitly set" — buyer-facing
-- UI falls back to the return window in that case.

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "replacementWindow" INTEGER;

COMMENT ON COLUMN "products"."replacementWindow" IS
  'Replacement window in days after delivery (set by admin on approval when isReplaceable = true). NULL when not explicitly chosen.';
