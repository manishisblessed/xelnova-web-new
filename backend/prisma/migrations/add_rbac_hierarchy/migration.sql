-- AlterEnum
ALTER TYPE "AdminRoleLevel" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "AdminRoleLevel" ADD VALUE 'MANAGER';
ALTER TYPE "AdminRoleLevel" ADD VALUE 'EDITOR';
ALTER TYPE "AdminRoleLevel" ADD VALUE 'VIEWER';

-- AlterTable
ALTER TABLE "admin_roles" ADD COLUMN "description" TEXT,
ADD COLUMN "level" "AdminRoleLevel" NOT NULL DEFAULT 'VIEWER',
ADD COLUMN "permissionsData" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "isTemplate" BOOLEAN NOT NULL DEFAULT false;
