-- Make SellerProfile.userId optional (nullable) so seller and customer
-- accounts are independent entities. Deleting a User sets userId to NULL
-- instead of cascade-deleting the SellerProfile.

-- Add email and phone columns to seller_profiles for independent identity
ALTER TABLE "seller_profiles" ADD COLUMN "email" TEXT;
ALTER TABLE "seller_profiles" ADD COLUMN "phone" TEXT;

-- Backfill email/phone from linked users
UPDATE "seller_profiles" sp
SET "email" = u."email", "phone" = u."phone"
FROM "users" u
WHERE sp."userId" = u."id" AND sp."email" IS NULL;

-- Create unique index on email
CREATE UNIQUE INDEX "seller_profiles_email_key" ON "seller_profiles"("email");

-- Make userId nullable
ALTER TABLE "seller_profiles" ALTER COLUMN "userId" DROP NOT NULL;

-- Drop the existing CASCADE foreign key and recreate with SET NULL
ALTER TABLE "seller_profiles" DROP CONSTRAINT "seller_profiles_userId_fkey";
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
