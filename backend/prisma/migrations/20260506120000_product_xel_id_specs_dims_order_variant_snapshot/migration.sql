-- Xelnova public product id, structured dimensions, order line variant snapshot

CREATE TABLE "product_public_id_seq" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lastValue" INTEGER NOT NULL DEFAULT 9044,

    CONSTRAINT "product_public_id_seq_pkey" PRIMARY KEY ("id")
);

INSERT INTO "product_public_id_seq" ("id", "lastValue") VALUES (1, 9044);

ALTER TABLE "products" ADD COLUMN "xelnovaProductId" TEXT;
CREATE UNIQUE INDEX "products_xelnovaProductId_key" ON "products"("xelnovaProductId");

ALTER TABLE "products" ADD COLUMN "productLengthCm" DOUBLE PRECISION;
ALTER TABLE "products" ADD COLUMN "productWidthCm" DOUBLE PRECISION;
ALTER TABLE "products" ADD COLUMN "productHeightCm" DOUBLE PRECISION;
ALTER TABLE "products" ADD COLUMN "productWeightKg" DOUBLE PRECISION;
ALTER TABLE "products" ADD COLUMN "packageLengthCm" DOUBLE PRECISION;
ALTER TABLE "products" ADD COLUMN "packageWidthCm" DOUBLE PRECISION;
ALTER TABLE "products" ADD COLUMN "packageHeightCm" DOUBLE PRECISION;
ALTER TABLE "products" ADD COLUMN "packageWeightKg" DOUBLE PRECISION;

ALTER TABLE "order_items" ADD COLUMN "variantSku" TEXT;
ALTER TABLE "order_items" ADD COLUMN "variantImage" TEXT;
ALTER TABLE "order_items" ADD COLUMN "variantAttributes" JSONB;
