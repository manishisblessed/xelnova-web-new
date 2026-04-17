-- Allow phone-only signups without a placeholder email.

-- Drop synthetic emails that were auto-generated for phone-only signups
-- so the User can supply a real email at checkout / on profile.
UPDATE "users"
SET "email" = NULL
WHERE "email" LIKE '%@phone.user.xelnova.in';

-- Make email optional on User; the @unique constraint still applies
-- to non-null values (Postgres treats NULLs as distinct).
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
