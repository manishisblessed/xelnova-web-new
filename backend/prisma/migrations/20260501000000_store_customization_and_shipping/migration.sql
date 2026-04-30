-- Adds store customization columns, featuredProductIds, the
-- seller_store_banners table, shipments table, seller_courier_configs
-- table, and associated enums.  Fully idempotent (IF NOT EXISTS).

-- ══════════════════════════════════════════════════════════════════════
-- 1. Enums
-- ══════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE "ShippingMode" AS ENUM (
    'SELF_SHIP', 'XELNOVA_COURIER', 'DELHIVERY', 'SHIPROCKET', 'XPRESSBEES', 'EKART'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ShipmentStatus" AS ENUM (
    'PENDING', 'BOOKED', 'PICKUP_SCHEDULED', 'PICKED_UP',
    'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED',
    'RTO_INITIATED', 'RTO_DELIVERED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- 2. seller_profiles — store customization columns
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "heroBannerUrl" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "heroBannerMobile" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "aboutTitle" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "aboutDescription" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "featuredProductIds" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "seller_profiles" ADD COLUMN IF NOT EXISTS "storeThemeColor" TEXT DEFAULT '#7c3aed';

-- ══════════════════════════════════════════════════════════════════════
-- 3. seller_store_banners
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "seller_store_banners" (
    "id"        TEXT NOT NULL,
    "sellerId"  TEXT NOT NULL,
    "title"     TEXT,
    "imageUrl"  TEXT NOT NULL,
    "mobileUrl" TEXT,
    "link"      TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_store_banners_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "seller_store_banners_sellerId_idx"
  ON "seller_store_banners" ("sellerId");

DO $$ BEGIN
  ALTER TABLE "seller_store_banners"
    ADD CONSTRAINT "seller_store_banners_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- 4. shipments
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "shipments" (
    "id"              TEXT NOT NULL,
    "orderId"         TEXT NOT NULL,
    "sellerId"        TEXT NOT NULL,
    "shippingMode"    "ShippingMode" NOT NULL,
    "courierProvider" TEXT,
    "awbNumber"       TEXT,
    "trackingUrl"     TEXT,
    "shipmentStatus"  "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "courierOrderId"  TEXT,
    "labelUrl"        TEXT,
    "manifestUrl"     TEXT,
    "pickupDate"      TIMESTAMP(3),
    "deliveredAt"     TIMESTAMP(3),
    "weight"          DOUBLE PRECISION,
    "dimensions"      TEXT,
    "courierCharges"  DOUBLE PRECISION,
    "statusHistory"   JSONB NOT NULL DEFAULT '[]',
    "pickupLocationId" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "shipments_orderId_key" ON "shipments" ("orderId");
CREATE INDEX IF NOT EXISTS "shipments_sellerId_idx" ON "shipments" ("sellerId");
CREATE INDEX IF NOT EXISTS "shipments_awbNumber_idx" ON "shipments" ("awbNumber");
CREATE INDEX IF NOT EXISTS "shipments_shipmentStatus_idx" ON "shipments" ("shipmentStatus");
CREATE INDEX IF NOT EXISTS "shipments_pickupLocationId_idx" ON "shipments" ("pickupLocationId");

DO $$ BEGIN
  ALTER TABLE "shipments"
    ADD CONSTRAINT "shipments_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "shipments"
    ADD CONSTRAINT "shipments_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "shipments"
    ADD CONSTRAINT "shipments_pickupLocationId_fkey"
    FOREIGN KEY ("pickupLocationId") REFERENCES "seller_pickup_locations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- 5. seller_courier_configs
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "seller_courier_configs" (
    "id"          TEXT NOT NULL,
    "sellerId"    TEXT NOT NULL,
    "provider"    "ShippingMode" NOT NULL,
    "apiKey"      TEXT NOT NULL,
    "apiSecret"   TEXT,
    "accountId"   TEXT,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "warehouseId" TEXT,
    "metadata"    JSONB,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_courier_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "seller_courier_configs_sellerId_provider_key"
  ON "seller_courier_configs" ("sellerId", "provider");

DO $$ BEGIN
  ALTER TABLE "seller_courier_configs"
    ADD CONSTRAINT "seller_courier_configs_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- 6. Backfill: ensure existing seller_profiles rows get empty arrays
--    for featuredProductIds (handles rows inserted before the DEFAULT
--    was present, where the column may have been added as NULL initially
--    by a prior db push).
-- ══════════════════════════════════════════════════════════════════════

UPDATE "seller_profiles"
SET "featuredProductIds" = '{}'
WHERE "featuredProductIds" IS NULL;
