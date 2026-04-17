-- Sub-admin RBAC + product bestsellers rank
--
-- 1. Ensure admin_roles table exists (it was historically created via
--    `prisma db push` in some environments, so reproduce it here for
--    clean installs and deferred migrations).
-- 2. Drop the legacy denormalised user counter on admin_roles. We now derive
--    membership counts from the new users.adminRoleId foreign-key relation.
-- 3. Add foreign key from users.adminRoleId → admin_roles.id so admin users
--    can be linked to a custom role (the column itself was added by Prisma
--    in an earlier migration but had no FK).
-- 4. Add products.bestSellersRank for admin-curated bestseller ranking
--    (replaces the seller-side "Best Sellers Rank" attribute).

CREATE TABLE IF NOT EXISTS "admin_roles" (
    "id"          TEXT PRIMARY KEY,
    "name"        TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "isSystem"    BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "admin_roles_name_key" ON "admin_roles"("name");

ALTER TABLE "admin_roles" DROP COLUMN IF EXISTS "users";

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'users_adminRoleId_fkey'
          AND table_name = 'users'
    ) THEN
        ALTER TABLE "users"
            ADD CONSTRAINT "users_adminRoleId_fkey"
            FOREIGN KEY ("adminRoleId") REFERENCES "admin_roles"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "users_adminRoleId_idx" ON "users"("adminRoleId");

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "bestSellersRank" INTEGER;
CREATE INDEX IF NOT EXISTS "products_bestSellersRank_idx" ON "products"("bestSellersRank");

-- 4. Per-product commission percentage. Set by admin during product approval.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "commissionRate" DOUBLE PRECISION;

-- 5. Sequential, human-readable seller code (e.g. "Grand_HR-XEL00001").
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "sellerCode" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "sellerCodeSequence" INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = 'seller_profiles_sellerCode_key'
    ) THEN
        CREATE UNIQUE INDEX "seller_profiles_sellerCode_key"
            ON "seller_profiles"("sellerCode");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = current_schema()
          AND indexname = 'seller_profiles_sellerCodeSequence_key'
    ) THEN
        CREATE UNIQUE INDEX "seller_profiles_sellerCodeSequence_key"
            ON "seller_profiles"("sellerCodeSequence");
    END IF;
END $$;
