/**
 * One-off data migration — May 2026.
 *
 * Background
 * ──────────
 * Some products were saved with a malformed `variants` JSON shape: instead
 * of one canonical Colour group containing all the colour options and one
 * Size group containing all the size options, each colour was stored as
 * its own group whose `options` array was the list of SIZES for that
 * colour. The serializer dedups type strings with a `-1`, `-2`, ... suffix,
 * so the on-disk shape looked like:
 *
 *   [
 *     { type: "color",   label: "Chikoo",     options: [{label: "S"}, {label: "M"}, ...] },
 *     { type: "color-1", label: "Off- White", options: [{label: "S"}, {label: "M"}, ...] },
 *   ]
 *
 * That corrupted the order-line snapshot at checkout because every group's
 * "S" option matched the size token in the cart's variant string, leaving
 * a snapshot like `{ Chikoo: "S", "Off- White": "S" }` on the order item
 * (visible to both seller and consumer on the order detail screen) with
 * the wrong colour's SKU.
 *
 * This script reshapes any such product into the intended canonical form:
 *
 *   [
 *     { type: "color", label: "Colour", options: [{label: "Chikoo", ...}, {label: "Off- White", ...}] },
 *     { type: "size",  label: "Size",   options: [{label: "S"}, {label: "M"}, ...] },
 *   ]
 *
 * Per-colour SKU / hex / images / price / stock previously attached to the
 * source group's first inner option (where sellers typically put it) are
 * promoted onto the new colour option so nothing is lost. Inner options
 * are merged across the source groups and deduped by their slugified value.
 *
 * `OrderItem.variantAttributes` is intentionally NOT touched — historical
 * order snapshots are frozen at the data the customer saw at checkout. The
 * runtime snapshot builder also self-heals (see
 * `backend/src/common/helpers/variant-selection.ts → normalizeVariantGroups`)
 * so any orders placed before this script runs will still render correctly
 * when fetched today.
 *
 * Usage:
 *   cd backend
 *   npx tsx prisma/migrate-fix-duplicate-variant-groups.ts          # dry run
 *   npx tsx prisma/migrate-fix-duplicate-variant-groups.ts --apply  # actually update DB
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes('--apply');

type VariantOption = {
  value?: string;
  label?: string;
  sku?: string;
  stock?: number;
  price?: number;
  compareAtPrice?: number;
  images?: string[];
  hex?: string;
  available?: boolean;
  [key: string]: unknown;
};

type VariantGroup = {
  type?: string;
  label?: string;
  options?: VariantOption[];
  [key: string]: unknown;
};

function normKey(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function canonicalKind(group: VariantGroup): string {
  const raw = String(group.type ?? '').trim().toLowerCase();
  const stripped = raw.replace(/-\d+$/, '');
  if (stripped === 'color' || stripped === 'size') return stripped;
  return raw || 'other';
}

function canonicalKindLabel(kind: string): string {
  if (kind === 'color') return 'Colour';
  if (kind === 'size') return 'Size';
  return 'Option';
}

/**
 * Returns `null` if the variants JSON is already well-formed, otherwise
 * returns the repaired JSON.
 */
function repairVariants(raw: unknown): { repaired: VariantGroup[] | null; issues: string[] } {
  const issues: string[] = [];
  if (!Array.isArray(raw)) return { repaired: null, issues };

  const groups = raw as VariantGroup[];
  const buckets = new Map<string, VariantGroup[]>();
  const order: string[] = [];
  for (const g of groups) {
    if (!g || typeof g !== 'object') continue;
    const kind = canonicalKind(g);
    if (!buckets.has(kind)) {
      buckets.set(kind, []);
      order.push(kind);
    }
    buckets.get(kind)!.push(g);
  }

  const hasDuplicates = Array.from(buckets.values()).some((list) => list.length > 1);
  if (!hasDuplicates) return { repaired: null, issues };

  const out: VariantGroup[] = [];
  for (const kind of order) {
    const list = buckets.get(kind)!;
    if (list.length <= 1) {
      out.push(...list);
      continue;
    }

    issues.push(
      `merging ${list.length} "${kind}" groups (labels: ${list
        .map((g) => `"${String(g.label ?? '').trim()}"`)
        .join(', ')})`,
    );

    const outerOptions: VariantOption[] = [];
    const innerByValue = new Map<string, VariantOption>();

    for (const g of list) {
      const rawLabel = String(g.label ?? '').trim();
      if (rawLabel) {
        const meta = Array.isArray(g.options) && g.options[0] ? g.options[0] : ({} as VariantOption);
        const promoted: VariantOption = {
          value: normKey(rawLabel),
          label: rawLabel,
          available: true,
        };
        if (typeof g['hex'] === 'string') promoted.hex = g['hex'] as string;
        else if (typeof meta.hex === 'string') promoted.hex = meta.hex;
        if (Array.isArray(g['images']) && g['images'].length > 0) {
          promoted.images = (g['images'] as unknown[]).map(String).filter(Boolean);
        } else if (Array.isArray(meta.images) && meta.images.length > 0) {
          promoted.images = meta.images.map(String).filter(Boolean);
        }
        if (typeof meta.sku === 'string' && meta.sku.trim()) promoted.sku = meta.sku.trim();
        if (typeof meta.price === 'number') promoted.price = meta.price;
        if (typeof meta.compareAtPrice === 'number') promoted.compareAtPrice = meta.compareAtPrice;
        if (typeof meta.stock === 'number') promoted.stock = meta.stock;
        outerOptions.push(promoted);
      }

      for (const opt of g.options ?? []) {
        if (!opt || typeof opt !== 'object') continue;
        const k = normKey(opt.value ?? opt.label ?? '');
        if (!k) continue;
        if (!innerByValue.has(k)) {
          // Strip metadata that belongs to the OUTER dimension (sku, price,
          // images, hex were promoted above onto the colour option) so the
          // inner size option doesn't carry colour-specific values.
          const { sku: _sku, price: _price, compareAtPrice: _cap, images: _imgs, hex: _hex, ...rest } = opt;
          void _sku; void _price; void _cap; void _imgs; void _hex;
          innerByValue.set(k, { ...rest, value: k });
        }
      }
    }

    if (outerOptions.length > 0) {
      out.push({
        type: kind,
        label: canonicalKindLabel(kind),
        options: outerOptions,
      });
    }

    if (innerByValue.size > 0) {
      const innerKind = kind === 'color' ? 'size' : 'other';
      const inferredType = buckets.has(innerKind) && innerKind !== kind
        ? `${innerKind}-merged`
        : innerKind;
      out.push({
        type: inferredType,
        label: canonicalKindLabel(innerKind),
        options: Array.from(innerByValue.values()),
      });
    }
  }

  return { repaired: out, issues };
}

async function main() {
  console.log(
    `\nVariant-shape repair → ${APPLY ? 'APPLY mode (DB will be updated)' : 'DRY RUN (no writes)'}\n`,
  );

  const products = await prisma.product.findMany({
    select: { id: true, name: true, slug: true, variants: true },
  });

  let touched = 0;
  let skipped = 0;
  const sample: string[] = [];

  for (const p of products) {
    const { repaired, issues } = repairVariants(p.variants);
    if (!repaired) {
      skipped += 1;
      continue;
    }
    touched += 1;
    if (sample.length < 20) {
      sample.push(`  • ${p.name} [${p.slug}]\n      ${issues.join('\n      ')}`);
    }
    if (APPLY) {
      await prisma.product.update({
        where: { id: p.id },
        data: { variants: repaired as never },
      });
    }
  }

  console.log(`Products scanned : ${products.length}`);
  console.log(`Products updated : ${touched}`);
  console.log(`Products skipped : ${skipped}  (already well-formed)`);
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
  .finally(() => prisma.$disconnect());
