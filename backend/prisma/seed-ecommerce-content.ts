/**
 * Run on an existing database to fill Brands, Banners, Coupons, and CMS Pages
 * without wiping users, orders, or categories.
 *
 * Usage: pnpm exec npm run db:seed:ecommerce --prefix backend
 *    or: cd backend && npm run db:seed:ecommerce
 */
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { upsertEcommerceDemoData } from "./seed-ecommerce";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🛒 Upserting ecommerce demo data (brands, banners, coupons, CMS)...\n");
  const ec = await upsertEcommerceDemoData(prisma);
  console.log("✅ Done:", ec);
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
