-- Allow phone-only signups without a placeholder email.

-- Drop the NOT NULL constraint first so the subsequent UPDATE that sets
-- email = NULL doesn't violate the constraint inside the transaction.
-- The @unique constraint still applies to non-null values
-- (Postgres treats NULLs as distinct).
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- Drop synthetic emails that were auto-generated for phone-only signups
-- so the User can supply a real email at checkout / on profile.
UPDATE "users"
SET "email" = NULL
WHERE "email" LIKE '%@phone.user.xelnova.in';
