-- Multi-pickup-location support for sellers.
--
-- Adds the `seller_pickup_locations` table + a nullable
-- `pickupLocationId` FK on `shipments`, then backfills one default
-- pickup location per existing seller from their `businessAddress`
-- (and migrates the existing `xelgoWarehouse*` columns onto that row
-- so the already-registered Delhivery warehouse keeps working).
--
-- The legacy `xelgoWarehouse*` columns on `seller_profiles` are
-- intentionally kept to allow application rollback. New code reads /
-- writes `seller_pickup_locations` exclusively.

-- ── 1. Create the new table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "seller_pickup_locations" (
    "id"            TEXT NOT NULL,
    "sellerId"      TEXT NOT NULL,
    "label"         TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone"         TEXT NOT NULL,
    "email"         TEXT,
    "addressLine"   TEXT NOT NULL,
    "city"          TEXT NOT NULL,
    "state"         TEXT NOT NULL,
    "country"       TEXT NOT NULL DEFAULT 'India',
    "pincode"       TEXT NOT NULL,
    "isDefault"     BOOLEAN NOT NULL DEFAULT false,
    "xelgoWarehouseName"              TEXT,
    "xelgoWarehouseRegisteredAt"      TIMESTAMP(3),
    "xelgoWarehouseRegistrationError" TEXT,
    "xelgoWarehouseSnapshotHash"      TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "seller_pickup_locations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "seller_pickup_locations_xelgoWarehouseName_key"
    ON "seller_pickup_locations" ("xelgoWarehouseName");
CREATE INDEX IF NOT EXISTS "seller_pickup_locations_sellerId_idx"
    ON "seller_pickup_locations" ("sellerId");
CREATE INDEX IF NOT EXISTS "seller_pickup_locations_sellerId_isDefault_idx"
    ON "seller_pickup_locations" ("sellerId", "isDefault");

ALTER TABLE "seller_pickup_locations"
  ADD CONSTRAINT "seller_pickup_locations_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 2. Add the FK column on shipments ───────────────────────────────
ALTER TABLE "shipments"
  ADD COLUMN IF NOT EXISTS "pickupLocationId" TEXT;

CREATE INDEX IF NOT EXISTS "shipments_pickupLocationId_idx"
    ON "shipments" ("pickupLocationId");

ALTER TABLE "shipments"
  ADD CONSTRAINT "shipments_pickupLocationId_fkey"
  FOREIGN KEY ("pickupLocationId") REFERENCES "seller_pickup_locations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 3. Backfill: one default location per seller ────────────────────
--
-- Eligible sellers have a complete businessAddress AND a phone we can
-- send to the carrier. Sellers with incomplete profiles are skipped —
-- they'll create their first pickup location through the new UI when
-- they fill the form (no point creating a half-broken row now).
--
-- The carrier-side warehouse fields (xelgoWarehouseName etc.) are
-- copied across so the Delhivery warehouse that's already on file for
-- this seller keeps being the default one. NULLs propagate cleanly —
-- those sellers haven't registered yet and will go through the lazy
-- ensure-warehouse path on first ship.
INSERT INTO "seller_pickup_locations" (
    "id",
    "sellerId",
    "label",
    "contactPerson",
    "phone",
    "email",
    "addressLine",
    "city",
    "state",
    "country",
    "pincode",
    "isDefault",
    "xelgoWarehouseName",
    "xelgoWarehouseRegisteredAt",
    "xelgoWarehouseRegistrationError",
    "xelgoWarehouseSnapshotHash",
    "createdAt",
    "updatedAt"
)
SELECT
    'plc_' || substr(md5(random()::text || sp."id"), 1, 22)        AS "id",
    sp."id"                                                         AS "sellerId",
    'Main pickup address'                                           AS "label",
    sp."storeName"                                                  AS "contactPerson",
    -- Prefer the seller-profile phone, fall back to the user's phone.
    -- regexp_replace strips formatting; we keep digits + leading "+".
    COALESCE(
        NULLIF(regexp_replace(sp."phone",        '[^0-9+]', '', 'g'), ''),
        NULLIF(regexp_replace(u."phone",         '[^0-9+]', '', 'g'), '')
    )                                                               AS "phone",
    COALESCE(sp."email", u."email")                                 AS "email",
    sp."businessAddress"                                            AS "addressLine",
    sp."businessCity"                                               AS "city",
    sp."businessState"                                              AS "state",
    'India'                                                         AS "country",
    sp."businessPincode"                                            AS "pincode",
    TRUE                                                            AS "isDefault",
    sp."xelgoWarehouseName",
    sp."xelgoWarehouseRegisteredAt",
    sp."xelgoWarehouseRegistrationError",
    sp."xelgoWarehouseSnapshotHash",
    NOW(),
    NOW()
FROM "seller_profiles" sp
LEFT JOIN "users" u ON u."id" = sp."userId"
WHERE
    sp."businessAddress" IS NOT NULL AND length(trim(sp."businessAddress")) > 0
    AND sp."businessCity"    IS NOT NULL AND length(trim(sp."businessCity"))    > 0
    AND sp."businessState"   IS NOT NULL AND length(trim(sp."businessState"))   > 0
    AND sp."businessPincode" IS NOT NULL AND length(trim(sp."businessPincode")) > 0
    AND COALESCE(
        NULLIF(regexp_replace(sp."phone", '[^0-9+]', '', 'g'), ''),
        NULLIF(regexp_replace(u."phone",  '[^0-9+]', '', 'g'), '')
    ) IS NOT NULL
    -- Idempotency: don't create a default if the seller already has any
    -- pickup location row (only matters if the migration is re-run).
    AND NOT EXISTS (
        SELECT 1 FROM "seller_pickup_locations" pl
        WHERE pl."sellerId" = sp."id"
    );

-- ── 4. Backfill shipments.pickupLocationId for already-shipped orders ─
--
-- Every shipment that pre-dates this migration was booked from the
-- seller's single (now default) pickup location. Pointing them at it
-- preserves the shipment timeline / tracking history filtering UI we
-- expose per location.
UPDATE "shipments" s
SET "pickupLocationId" = pl."id"
FROM "seller_pickup_locations" pl
WHERE
    pl."sellerId" = s."sellerId"
    AND pl."isDefault" = TRUE
    AND s."pickupLocationId" IS NULL;
