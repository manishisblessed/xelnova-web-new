-- Per-role uniqueness for User.email and User.phone.
--
-- BEFORE: one email = one user account (single-column UNIQUE on email/phone).
-- AFTER:  same email/phone may exist once per Role (CUSTOMER/SELLER/ADMIN/
--         BUSINESS), so a person can hold a separate shopper account and
--         seller account without one overwriting the other.
--
-- Existing rows are unaffected — every current user already has a single
-- (email, role) and (phone, role) tuple, so the new composite unique
-- indexes are satisfied immediately.
--
-- IMPORTANT: never re-introduce a single-column UNIQUE on these columns.
-- Doing so will silently re-merge multi-role accounts and break login
-- routing across apps.

DROP INDEX IF EXISTS "users_email_key";
DROP INDEX IF EXISTS "users_phone_key";

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_role_key"
  ON "users" ("email", "role");

CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_role_key"
  ON "users" ("phone", "role");
