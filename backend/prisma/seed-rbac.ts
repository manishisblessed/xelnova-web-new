import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Permission structure for all sections
type PermissionData = Record<string, Record<string, boolean>>;

// Define all sections and their actions
const DEFAULT_PERMISSIONS: PermissionData = {
  products: {
    view: false,
    create: false,
    edit: false,
    delete: false,
    approve: false,
    reject: false,
    feature: false,
  },
  orders: {
    view: false,
    edit: false,
    cancel: false,
    refund: false,
    exportData: false,
  },
  shipments: {
    view: false,
    cancel: false,
    reschedule: false,
    track: false,
  },
  customers: {
    view: false,
    edit: false,
    ban: false,
    exportData: false,
  },
  brands: {
    view: false,
    create: false,
    edit: false,
    delete: false,
    approve: false,
  },
  categories: {
    view: false,
    create: false,
    edit: false,
    delete: false,
  },
  coupons: {
    view: false,
    create: false,
    edit: false,
    delete: false,
  },
  reports: {
    view: false,
    export: false,
  },
  roles: {
    view: false,
    create: false,
    edit: false,
    delete: false,
    assignRoles: false,
  },
  settings: {
    view: false,
    edit: false,
  },
};

// Role templates with their permission configurations
const ROLE_TEMPLATES = [
  {
    name: "Seller",
    level: "EDITOR",
    description: "Sellers can manage their products, orders, and shipments including cancel and reschedule",
    isTemplate: true,
    permissions: {
      ...DEFAULT_PERMISSIONS,
      products: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        approve: false,
        reject: false,
        feature: false,
      },
      orders: {
        view: true,
        edit: true,
        cancel: true,
        refund: false,
        exportData: true,
      },
      shipments: {
        view: true,
        cancel: true,
        reschedule: true,
        track: true,
      },
      reports: { view: true, export: true },
    },
  },
  {
    name: "Product Manager",
    level: "MANAGER",
    description: "Full control over products with approval/rejection authority",
    isTemplate: true,
    permissions: {
      ...DEFAULT_PERMISSIONS,
      products: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        approve: true,
        reject: true,
        feature: true,
      },
      orders: { view: true, edit: false, cancel: false, refund: false, exportData: false },
      customers: { view: true, edit: false, ban: false, exportData: false },
      reports: { view: true, export: true },
    },
  },
  {
    name: "Order Manager",
    level: "MANAGER",
    description: "Full control over orders and refunds",
    isTemplate: true,
    permissions: {
      ...DEFAULT_PERMISSIONS,
      orders: {
        view: true,
        edit: true,
        cancel: true,
        refund: true,
        exportData: true,
      },
      shipments: {
        view: true,
        cancel: true,
        reschedule: true,
        track: true,
      },
      products: { view: true, create: false, edit: false, delete: false, approve: false, reject: false, feature: false },
      customers: { view: true, edit: false, ban: false, exportData: false },
      reports: { view: true, export: true },
    },
  },
  {
    name: "Customer Support",
    level: "EDITOR",
    description: "Support customer issues and process refunds",
    isTemplate: true,
    permissions: {
      ...DEFAULT_PERMISSIONS,
      customers: { view: true, edit: true, ban: true, exportData: false },
      orders: { view: true, edit: true, cancel: true, refund: true, exportData: false },
      shipments: { view: true, cancel: true, reschedule: true, track: true },
      reports: { view: true, export: false },
    },
  },
  {
    name: "Content Manager",
    level: "EDITOR",
    description: "Manage brands, categories, coupons, and content",
    isTemplate: true,
    permissions: {
      ...DEFAULT_PERMISSIONS,
      brands: { view: true, create: true, edit: true, delete: true, approve: true },
      categories: { view: true, create: true, edit: true, delete: true },
      coupons: { view: true, create: true, edit: true, delete: true },
      products: { view: true, create: false, edit: false, delete: false, approve: false, reject: false, feature: false },
      reports: { view: true, export: false },
    },
  },
  {
    name: "Analyst",
    level: "VIEWER",
    description: "Read-only access to all sections with export capability",
    isTemplate: true,
    permissions: {
      ...DEFAULT_PERMISSIONS,
      products: { view: true, create: false, edit: false, delete: false, approve: false, reject: false, feature: false },
      orders: { view: true, edit: false, cancel: false, refund: false, exportData: true },
      customers: { view: true, edit: false, ban: false, exportData: true },
      brands: { view: true, create: false, edit: false, delete: false, approve: false },
      categories: { view: true, create: false, edit: false, delete: false },
      coupons: { view: true, create: false, edit: false, delete: false },
      reports: { view: true, export: true },
      roles: { view: true, create: false, edit: false, delete: false, assignRoles: false },
      settings: { view: true, edit: false },
    },
  },
  {
    name: "Moderator",
    level: "VIEWER",
    description: "View and moderate users and products",
    isTemplate: true,
    permissions: {
      ...DEFAULT_PERMISSIONS,
      customers: { view: true, edit: false, ban: true, exportData: false },
      products: { view: true, create: false, edit: false, delete: false, approve: false, reject: true, feature: false },
      reports: { view: true, export: false },
    },
  },
];

async function main() {
  try {
    console.log("🌱 Starting RBAC data migration...\n");

    // Migrate existing roles to new structure
    const existingRoles = await prisma.adminRole.findMany();
    console.log(`📊 Found ${existingRoles.length} existing roles to migrate`);

    for (const role of existingRoles) {
      // Convert comma-separated permissions to structured format
      const permissionsArray = role.permissions
        .split(",")
        .map((p) => p.trim().toLowerCase())
        .filter((p) => p.length > 0);

      const permissionsData = { ...DEFAULT_PERMISSIONS };

      // Map legacy permissions to new structure
      for (const permission of permissionsArray) {
        // Handle section:action format if it exists, otherwise treat as section
        if (permission.includes(":")) {
          const [section, action] = permission.split(":");
          if (permissionsData[section] && permissionsData[section][action] !== undefined) {
            permissionsData[section][action] = true;
          }
        } else {
          // Legacy format: just section name means view access
          if (permissionsData[permission]) {
            permissionsData[permission].view = true;
          }
        }
      }

      await prisma.adminRole.update({
        where: { id: role.id },
        data: {
          permissionsData,
          level: "VIEWER",
          isTemplate: false,
        },
      });
      console.log(`  ✅ Migrated role: ${role.name}`);
    }

    // Add role templates if they don't exist
    console.log("\n📋 Adding role templates...");
    for (const template of ROLE_TEMPLATES) {
      const exists = await prisma.adminRole.findUnique({
        where: { name: template.name },
      });

      if (!exists) {
        await prisma.adminRole.create({
          data: {
            name: template.name,
            description: template.description,
            level: template.level as any,
            permissions: "", // Legacy field
            permissionsData: template.permissions as any,
            isTemplate: true,
            isSystem: false,
          },
        });
        console.log(`  ✅ Created template: ${template.name}`);
      } else {
        console.log(`  ⏭️  Skipped (already exists): ${template.name}`);
      }
    }

    console.log("\n🎉 RBAC migration completed successfully!");
    console.log("─".repeat(50));
    console.log(`Migrated roles:     ${existingRoles.length}`);
    console.log(`New templates:      ${ROLE_TEMPLATES.length}`);
    console.log("─".repeat(50));
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
