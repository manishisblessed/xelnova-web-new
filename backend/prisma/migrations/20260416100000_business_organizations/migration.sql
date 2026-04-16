-- B2B: platform role BUSINESS + organizations / memberships

DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE 'BUSINESS';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrganizationMemberRole" AS ENUM ('ORG_ADMIN', 'BUYER', 'APPROVER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "gstin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "organization_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "OrganizationMemberRole" NOT NULL DEFAULT 'BUYER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "organization_members_userId_organizationId_key"
  ON "organization_members"("userId", "organizationId");

CREATE INDEX IF NOT EXISTS "organization_members_organizationId_idx"
  ON "organization_members"("organizationId");

DO $$ BEGIN
  ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
