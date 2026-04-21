/**
 * One-off data migration — Apr 2026.
 *
 * Background
 * ──────────
 * Until now the seller's typed (GST-inclusive) price was being converted to a
 * pre-GST taxable value before being stored in `Product.price` /
 * `Product.compareAtPrice` and inside the variants JSON. The cart, product
 * page and invoice all re-added GST on top, so the seller saw `₹8` in the
 * inventory but the buyer paid `₹9` — a confusing rounding-loss loop.
 *
 * The new contract is:
 *   • `Product.price` is the GST-inclusive selling price (the seller-typed
 *     value).
 *   • The buyer pays exactly that number.
 *   • Invoices/reports back-out the taxable value & GST from it via
 *     `gstAmountFromInclusive`.
 *
 * This script converts every existing row's stored prices from the old
 * (exclusive) value to the new (inclusive) value so legacy products keep
 * showing the same number the buyer used to see.
 *
 *   newPrice          = round(oldPrice * (1 + gstRate / 100))
 *   newCompareAt      = round(oldCompareAt * (1 + gstRate / 100))
 *   variants[i].options[j].price          = round(oldOptPrice * (1 + gstRate/100))
 *   variants[i].options[j].compareAtPrice = round(oldOptCompare * (1 + gstRate/100))
 *
 * `OrderItem.price` is intentionally NOT migrated — historical orders are
 * frozen at the price the customer actually paid (which was already the
 * inclusive amount on the buyer's bill — see `OrdersService.create`).
 *
 * Usage:
 *   cd backend
 *   npx tsx prisma/migrate-prices-to-inclusive.ts          # dry run, prints diff
 *   npx tsx prisma/migrate-prices-to-inclusive.ts --apply  # actually update DB
 */

import { PrismaClient } from '@prisma/client';
import { DEFAULT_GST_PERCENT } from '@xelnova/utils';

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');

type VariantOption = {
  price?: number;
  compareAtPrice?: number;
  [k: string]: unknown;
};
type VariantGroup = {
  options?: VariantOption[];
  [k: string]: unknown;
};

function inclusive(amount: number, gstRate: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return amount;
  return Math.round(amount * (1 + gstRate / 100));
}

function migrateVariants(raw: unknown, gstRate: number): { value: unknown; changed: boolean } {
  if (!Array.isArray(raw)) return { value: raw, changed: false };
  let changed = false;
  const next = (raw as VariantGroup[]).map((g) => {
    if (!g || !Array.isArray(g.options)) return g;
    const options = g.options.map((o) => {
      if (!o || typeof o !== 'object') return o;
      const out: VariantOption = { ...o };
      if (typeof o.price === 'number') {
        const np = inclusive(o.price, gstRate);
        if (np !== o.price) {
          out.price = np;
          changed = true;
        }
      }
      if (typeof o.compareAtPrice === 'number') {
        const nc = inclusive(o.compareAtPrice, gstRate);
        if (nc !== o.compareAtPrice) {
          out.compareAtPrice = nc;
          changed = true;
        }
      }
      return out;
    });
    return { ...g, options };
  });
  return { value: next, changed };
}

async function main() {
  console.log(`\nPricing migration → ${APPLY ? 'APPLY mode (DB will be updated)' : 'DRY RUN (no writes)'}\n`);

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      price: true,
      compareAtPrice: true,
      gstRate: true,
      variants: true,
    },
  });

  let touched = 0;
  let skipped = 0;
  const sample: string[] = [];

  for (const p of products) {
    const gst = p.gstRate ?? DEFAULT_GST_PERCENT;
    const newPrice = inclusive(p.price, gst);
    const newCompare =
      p.compareAtPrice != null ? inclusive(p.compareAtPrice, gst) : p.compareAtPrice;
    const { value: newVariants, changed: variantsChanged } = migrateVariants(p.variants, gst);

    const priceChanged = newPrice !== p.price;
    const compareChanged = (p.compareAtPrice ?? null) !== (newCompare ?? null);

    if (!priceChanged && !compareChanged && !variantsChanged) {
      skipped += 1;
      continue;
    }

    touched += 1;
    if (sample.length < 10) {
      sample.push(
        `  • ${p.name}  (gst ${gst}%):  ₹${p.price} → ₹${newPrice}` +
          (p.compareAtPrice != null ? `   |  compareAt: ₹${p.compareAtPrice} → ₹${newCompare}` : '') +
          (variantsChanged ? '   |  variant prices updated' : ''),
      );
    }

    if (APPLY) {
      await prisma.product.update({
        where: { id: p.id },
        data: {
          price: newPrice,
          compareAtPrice: newCompare ?? null,
          variants: newVariants as never,
        },
      });
    }
  }

  console.log(`Products scanned : ${products.length}`);
  console.log(`Products updated : ${touched}`);
  console.log(`Products skipped : ${skipped}  (price was 0/missing or already migrated this run)`);
  if (sample.length > 0) {
    console.log(`\nSample of changes:\n${sample.join('\n')}`);
    if (touched > sample.length) {
      console.log(`  … and ${touched - sample.length} more.`);
    }
  }
  if (!APPLY) {
    console.log(`\nDry run complete. Re-run with --apply to write changes.`);
  } else {
    console.log(`\nDone. Database updated.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
