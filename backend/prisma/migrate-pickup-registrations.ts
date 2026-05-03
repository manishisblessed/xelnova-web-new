/**
 * One-off data migration — May 2026.
 *
 * Copies existing `xelgoWarehouseName` data from `SellerPickupLocation`
 * into the new `SellerPickupLocationRegistration` junction table as
 * Delhivery registrations (since the legacy Xelgo backend used Delhivery).
 *
 * This preserves existing registration state so sellers don't lose their
 * warehouse registrations after the multi-courier schema upgrade.
 *
 * Usage:
 *   cd backend
 *   npx tsx prisma/migrate-pickup-registrations.ts          # dry run
 *   npx tsx prisma/migrate-pickup-registrations.ts --apply  # actually update DB
 */

import 'dotenv/config';
import { PrismaClient, ShippingMode } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const APPLY = process.argv.includes('--apply');

async function main() {
  const locations = await prisma.sellerPickupLocation.findMany({
    where: {
      xelgoWarehouseName: { not: null },
    },
    select: {
      id: true,
      xelgoWarehouseName: true,
      xelgoWarehouseRegisteredAt: true,
      xelgoWarehouseRegistrationError: true,
      xelgoWarehouseSnapshotHash: true,
    },
  });

  console.log(`Found ${locations.length} pickup location(s) with xelgoWarehouseName set.`);

  if (locations.length === 0) {
    console.log('Nothing to migrate.');
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const loc of locations) {
    const existing = await prisma.sellerPickupLocationRegistration.findUnique({
      where: {
        pickupLocationId_provider: {
          pickupLocationId: loc.id,
          provider: ShippingMode.DELHIVERY,
        },
      },
    });

    if (existing) {
      console.log(`  SKIP ${loc.id} — already has a DELHIVERY registration (${existing.id})`);
      skipped++;
      continue;
    }

    const hasError = !!loc.xelgoWarehouseRegistrationError;

    console.log(
      `  ${APPLY ? 'MIGRATE' : 'WOULD MIGRATE'} ${loc.id}` +
      ` → warehouse="${loc.xelgoWarehouseName}"` +
      ` registeredAt=${loc.xelgoWarehouseRegisteredAt?.toISOString() ?? 'null'}` +
      ` error=${loc.xelgoWarehouseRegistrationError ?? 'null'}`,
    );

    if (APPLY) {
      await prisma.sellerPickupLocationRegistration.create({
        data: {
          pickupLocationId: loc.id,
          provider: ShippingMode.DELHIVERY,
          warehouseName: loc.xelgoWarehouseName,
          registeredAt: loc.xelgoWarehouseRegisteredAt,
          registrationError: loc.xelgoWarehouseRegistrationError,
          snapshotHash: loc.xelgoWarehouseSnapshotHash,
          isActive: !hasError,
        },
      });
    }
    created++;
  }

  console.log(`\nDone. ${created} created, ${skipped} skipped.`);
  if (!APPLY && created > 0) {
    console.log('Run with --apply to actually write to the database.');
  }
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
