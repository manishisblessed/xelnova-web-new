-- CreateEnum (if not exists) then add values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AdminRoleLevel') THEN
    CREATE TYPE "AdminRoleLevel" AS ENUM ('SUPER_ADMIN', 'MANAGER', 'EDITOR', 'VIEWER');
  ELSE
    BEGIN ALTER TYPE "AdminRoleLevel" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE "AdminRoleLevel" ADD VALUE IF NOT EXISTS 'MANAGER'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE "AdminRoleLevel" ADD VALUE IF NOT EXISTS 'EDITOR'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE "AdminRoleLevel" ADD VALUE IF NOT EXISTS 'VIEWER'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- AlterTable
ALTER TABLE "admin_roles" ADD COLUMN "description" TEXT,
ADD COLUMN "level" "AdminRoleLevel" NOT NULL DEFAULT 'VIEWER',
ADD COLUMN "permissionsData" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "isTemplate" BOOLEAN NOT NULL DEFAULT false;
