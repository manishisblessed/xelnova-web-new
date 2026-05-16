/**
 * Variant JSON types shared between seller UI and storefront.
 *
 * Each option value can optionally override the product's base price, stock,
 * and carry its own SKU. When `price` is present the storefront/order service
 * uses it instead of `product.price`.
 */

export type VariantOptionJson = {
  value: string;
  label: string;
  available: boolean;
  hex?: string;
  /** Option images — first is the main/thumbnail, rest are supporting (up to 5 total) */
  images?: string[];
  /** Optional variant video URL (max 15MB) */
  video?: string;
  videoPublicId?: string;
  price?: number;
  compareAtPrice?: number;
  stock?: number;
  sku?: string;
};

export type SizeChartRow = {
  label: string;
  values: Record<string, string>;
};

export type VariantGroupJson = {
  type: string;
  label: string;
  /** Label for the base/main product when shown alongside variant options */
  defaultLabel?: string;
  options: VariantOptionJson[];
  sizeChart?: SizeChartRow[];
};

// ─── Form types (seller inventory UI) ───

export const MAX_VARIANT_IMAGES = 5;

export type FormVariantValue = {
  id: string;
  label: string;
  hex: string;
  /** Up to 5 images — first is main/thumbnail, rest are supporting */
  images: string[];
  /** Optional video URL (max 15MB) */
  video: string;
  videoPublicId: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  sku: string;
};

export type SizeChartColumn = { id: string; header: string };

export type FormVariantRow = {
  id: string;
  label: string;
  /** Label for the base/main product when shown alongside variant options */
  defaultLabel: string;
  kind: 'color' | 'size' | 'other';
  values: FormVariantValue[];
  sizeChartEnabled: boolean;
  sizeChartColumns: SizeChartColumn[];
  sizeChartData: Record<string, Record<string, string>>;
};

// ─── Image helpers ───

export const MAX_PRODUCT_IMAGES = 5;

export type ProductImage = {
  id: string;
  url: string;
  publicId?: string;
};

let _imgIdCounter = 0;
export function makeImageId(): string {
  return `img-${Date.now()}-${++_imgIdCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function urlsToProductImages(urls: string[] | undefined | null): ProductImage[] {
  return (urls ?? []).filter(Boolean).map((url) => ({ id: makeImageId(), url }));
}

export function productImagesToUrls(images: ProductImage[]): string[] {
  return images.map((img) => img.url).filter(Boolean);
}

// Legacy compat — kept for any remaining callers
export function emptyImageSlots(): (string | null)[] {
  return Array.from({ length: 5 }, () => null);
}

export function imagesToSlots(urls: string[] | undefined | null): (string | null)[] {
  const slots = emptyImageSlots();
  const list = urls ?? [];
  for (let i = 0; i < 5 && i < list.length; i++) {
    slots[i] = list[i] || null;
  }
  return slots;
}

export function slotsToImages(slots: (string | null)[]): string[] {
  return slots.filter((u): u is string => Boolean(u?.trim()));
}

// ─── Helpers ───

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'option';
}

function normalizeHex(h: string): string | undefined {
  const t = h.trim();
  if (!t) return undefined;
  return t.startsWith('#') ? t : `#${t}`;
}

function optNum(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function optInt(s: string): number | undefined {
  const n = optNum(s);
  return n !== undefined ? Math.floor(n) : undefined;
}

export function newFormValue(defaultImages?: string[]): FormVariantValue {
  return {
    id: `fv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    hex: '',
    images: defaultImages ?? [],
    video: '',
    videoPublicId: '',
    price: '',
    compareAtPrice: '',
    stock: '',
    sku: '',
  };
}

export function newFormRow(defaultImages?: string[]): FormVariantRow {
  return {
    id: `vr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: 'Colour',
    defaultLabel: '',
    kind: 'color',
    values: [newFormValue(defaultImages)],
    sizeChartEnabled: false,
    sizeChartColumns: [],
    sizeChartData: {},
  };
}

export function newSizeChartColumn(): SizeChartColumn {
  return {
    id: `sc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    header: '',
  };
}

// ─── Serialization: form → JSON ───

/**
 * Merge rows that share the same canonical `kind` (`color` / `size`) into a
 * single row, preserving order and deduping values by their slugified label.
 *
 * Sellers occasionally added a second "Colour" row instead of adding a new
 * value inside the existing one — that produced a `variants` JSON with two
 * `type: "color"` (and `"color-1"`) groups, each holding the size options
 * inside. The order-line snapshot then emitted phantom attribute entries
 * like `{ Chikoo: "S", "Off- White": "S" }` because both groups matched the
 * same size token. Auto-merging here is the safety net that prevents the
 * malformed shape from ever reaching the API again.
 */
export function mergeDuplicateKindRows(rows: FormVariantRow[]): FormVariantRow[] {
  const indexByKind = new Map<'color' | 'size', number>();
  const out: FormVariantRow[] = [];

  for (const row of rows) {
    if (row.kind === 'color' || row.kind === 'size') {
      const existingIdx = indexByKind.get(row.kind);
      if (existingIdx === undefined) {
        indexByKind.set(row.kind, out.length);
        out.push({ ...row, values: [...row.values] });
      } else {
        const existing = out[existingIdx]!;
        const seenValues = new Set(
          existing.values
            .map((v) => v.label.trim().toLowerCase())
            .filter(Boolean),
        );
        const mergedValues = [...existing.values];
        for (const v of row.values) {
          const key = v.label.trim().toLowerCase();
          if (!key || seenValues.has(key)) continue;
          seenValues.add(key);
          mergedValues.push(v);
        }
        out[existingIdx] = { ...existing, values: mergedValues };
      }
    } else {
      out.push(row);
    }
  }

  return out;
}

export function formRowsToVariantGroups(rows: FormVariantRow[]): VariantGroupJson[] {
  const usedTypes = new Set<string>();
  return mergeDuplicateKindRows(rows)
    .filter((r) => r.label.trim() && r.values.some((v) => v.label.trim()))
    .map((r) => {
      let type = r.kind === 'other' ? slugify(r.label) : r.kind;
      const base = type;
      let n = 0;
      while (usedTypes.has(type)) {
        n += 1;
        type = `${base}-${n}`;
      }
      usedTypes.add(type);

      const options: VariantOptionJson[] = r.values
        .filter((v) => v.label.trim())
        .map((v) => {
          const opt: VariantOptionJson = {
            value: slugify(v.label),
            label: v.label.trim(),
            available: true,
          };
          if (r.kind === 'color') {
            const hex = normalizeHex(v.hex);
            if (hex) opt.hex = hex;
          }
          const imgs = v.images.filter((u) => u.trim());
          if (imgs.length > 0) opt.images = imgs;
          if (v.video.trim()) {
            opt.video = v.video.trim();
            if (v.videoPublicId.trim()) opt.videoPublicId = v.videoPublicId.trim();
          }
          const price = optNum(v.price);
          if (price !== undefined) opt.price = price;
          const compare = optNum(v.compareAtPrice);
          if (compare !== undefined) opt.compareAtPrice = compare;
          const stock = optInt(v.stock);
          if (stock !== undefined) opt.stock = stock;
          const sku = v.sku.trim();
          if (sku) opt.sku = sku;
          return opt;
        });

      const seen = new Set<string>();
      for (const o of options) {
        let v = o.value;
        let k = 0;
        while (seen.has(v)) {
          k += 1;
          v = `${slugify(o.label)}-${k}`;
        }
        o.value = v;
        seen.add(v);
      }

      const group: VariantGroupJson = { type, label: r.label.trim(), options };
      if (r.defaultLabel.trim()) group.defaultLabel = r.defaultLabel.trim();

      if (r.kind === 'size' && r.sizeChartEnabled && r.sizeChartColumns.length > 0) {
        const chart: SizeChartRow[] = r.values
          .filter((v) => v.label.trim())
          .map((v) => ({
            label: v.label.trim(),
            values: Object.fromEntries(
              r.sizeChartColumns
                .filter((c) => c.header.trim())
                .map((c) => [c.header.trim(), r.sizeChartData[v.id]?.[c.id] ?? '']),
            ),
          }))
          .filter((row) => Object.values(row.values).some((val) => val.trim()));
        if (chart.length > 0) group.sizeChart = chart;
      }

      return group;
    });
}

// ─── Deserialization: JSON → form ───

/**
 * Strips the `-1`, `-2` ... dedup suffix the serializer appends to duplicate
 * `kind` types so deserialization can group them back together.
 */
function canonicalGroupKind(rawType: string): 'color' | 'size' | 'other' {
  const stripped = rawType.replace(/-\d+$/, '');
  if (stripped === 'color') return 'color';
  if (stripped === 'size') return 'size';
  return 'other';
}

/**
 * Mirror of `mergeDuplicateKindRows` for the raw JSON shape — used on read
 * so a seller editing a legacy product whose `variants` JSON contains two
 * `type: "color"` groups sees ONE consolidated Colour row (with the colour
 * names from each source group as values) plus a derived Size row built
 * from the inner options. Without this the form would render two Colour
 * rows and the new validation would (correctly) block saving until the
 * seller fixed it by hand — silently healing here is much better UX and
 * matches what the seller almost certainly intended in the first place.
 */
function repairLegacyDuplicateKindGroups(raw: unknown[]): unknown[] {
  type RepairBucket = {
    kind: 'color' | 'size';
    /** Source group labels (e.g. colour names) become outer options. */
    outerOptions: Array<Record<string, unknown>>;
    /** Union of inner options across the duplicate groups. */
    innerOptions: Array<Record<string, unknown>>;
    /** Position of the first occurrence so we preserve order. */
    firstIdx: number;
  };

  const buckets = new Map<'color' | 'size', RepairBucket>();
  const passthroughs: Array<{ idx: number; value: unknown }> = [];

  raw.forEach((v, idx) => {
    if (!v || typeof v !== 'object') {
      passthroughs.push({ idx, value: v });
      return;
    }
    const o = v as Record<string, unknown>;
    const kind = canonicalGroupKind(String(o.type ?? ''));
    if (kind === 'other') {
      passthroughs.push({ idx, value: v });
      return;
    }
    let bucket = buckets.get(kind);
    if (!bucket) {
      bucket = {
        kind,
        outerOptions: [],
        innerOptions: [],
        firstIdx: idx,
      };
      buckets.set(kind, bucket);
    }
    bucket.outerOptions.push({
      label: String(o.label ?? ''),
      value: String(o.label ?? '').toLowerCase().replace(/\s+/g, '-'),
      hex: typeof o.hex === 'string' ? o.hex : undefined,
      images: Array.isArray(o.images) ? o.images : undefined,
      // Pull SKU/price/stock from the first inner option of the source
      // group (that is where sellers attached colour-level metadata).
      ...(Array.isArray(o.options) && o.options[0] && typeof o.options[0] === 'object'
        ? (() => {
            const meta = o.options[0] as Record<string, unknown>;
            const out: Record<string, unknown> = {};
            if (typeof meta.sku === 'string' && meta.sku.trim()) out.sku = meta.sku;
            if (typeof meta.price === 'number') out.price = meta.price;
            if (typeof meta.compareAtPrice === 'number') out.compareAtPrice = meta.compareAtPrice;
            if (typeof meta.stock === 'number') out.stock = meta.stock;
            return out;
          })()
        : {}),
    });
    if (Array.isArray(o.options)) {
      for (const opt of o.options) {
        if (!opt || typeof opt !== 'object') continue;
        const ok = opt as Record<string, unknown>;
        const valueKey = String(ok.value ?? ok.label ?? '').toLowerCase();
        if (!valueKey) continue;
        if (!bucket.innerOptions.some((p) => String(p.value ?? '').toLowerCase() === valueKey)) {
          bucket.innerOptions.push({ ...ok });
        }
      }
    }
  });

  const hasDuplicates = Array.from(buckets.values()).some((b) => b.outerOptions.length > 1);
  if (!hasDuplicates) return raw;

  const repaired: Array<{ idx: number; value: unknown }> = [...passthroughs];
  for (const bucket of buckets.values()) {
    if (bucket.outerOptions.length <= 1) {
      // Single original group — keep as-is at its original position.
      const original = raw.find(
        (v) =>
          v &&
          typeof v === 'object' &&
          canonicalGroupKind(String((v as Record<string, unknown>).type ?? '')) === bucket.kind,
      );
      if (original) repaired.push({ idx: bucket.firstIdx, value: original });
      continue;
    }

    const outerLabel = bucket.kind === 'color' ? 'Colour' : 'Size';
    repaired.push({
      idx: bucket.firstIdx,
      value: {
        type: bucket.kind,
        label: outerLabel,
        options: bucket.outerOptions,
      },
    });
    if (bucket.innerOptions.length > 0) {
      // For a duplicate "color" parent the inner dimension is almost
      // always size; fall back to a neutral label otherwise.
      const innerKind = bucket.kind === 'color' ? 'size' : 'other';
      const innerLabel = innerKind === 'size' ? 'Size' : 'Option';
      repaired.push({
        idx: bucket.firstIdx + 0.5,
        value: {
          type: innerKind,
          label: innerLabel,
          options: bucket.innerOptions,
        },
      });
    }
  }

  return repaired
    .sort((a, b) => a.idx - b.idx)
    .map((r) => r.value);
}

export function variantGroupsToFormRows(raw: unknown): FormVariantRow[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const healed = repairLegacyDuplicateKindGroups(raw);
  return healed.map((v: unknown, i: number) => {
    if (!v || typeof v !== 'object') {
      return {
        id: `vr-${i}`, label: '', defaultLabel: '', kind: 'other' as const, values: [],
        sizeChartEnabled: false, sizeChartColumns: [], sizeChartData: {},
      };
    }
    const o = v as Record<string, unknown>;
    const label = String(o.label ?? '');
    const type = String(o.type ?? 'other');
    const kind: FormVariantRow['kind'] =
      type === 'color' ? 'color' : type === 'size' ? 'size' : 'other';
    const opts = Array.isArray(o.options) ? o.options : [];
    const values: FormVariantValue[] = opts
      .filter((op): op is Record<string, unknown> => Boolean(op && typeof op === 'object'))
      .map((x, j) => ({
        id: `fv-${i}-${j}-${String(x.value ?? '')}`,
        label: String(x.label ?? x.value ?? ''),
        hex: String(x.hex ?? ''),
        images: Array.isArray(x.images) && (x.images as string[]).some(Boolean)
          ? (x.images as string[]).filter(Boolean)
          : [
              ...(typeof x.bigImage === 'string' && x.bigImage ? [x.bigImage] : []),
              ...(typeof x.image === 'string' && x.image && x.image !== x.bigImage ? [x.image] : []),
            ],
        video: typeof x.video === 'string' ? x.video : '',
        videoPublicId: typeof x.videoPublicId === 'string' ? x.videoPublicId : '',
        price: x.price != null ? String(x.price) : '',
        compareAtPrice: x.compareAtPrice != null ? String(x.compareAtPrice) : '',
        stock: x.stock != null ? String(x.stock) : '',
        sku: String(x.sku ?? ''),
      }));

    let sizeChartEnabled = false;
    let sizeChartColumns: SizeChartColumn[] = [];
    const sizeChartData: Record<string, Record<string, string>> = {};

    const rawChart = (o as Record<string, unknown>).sizeChart;
    if (kind === 'size' && Array.isArray(rawChart) && rawChart.length > 0) {
      sizeChartEnabled = true;
      const headerSet = new Set<string>();
      for (const row of rawChart) {
        if (row && typeof row === 'object' && 'values' in row) {
          const rv = (row as { values: Record<string, string> }).values;
          for (const h of Object.keys(rv)) headerSet.add(h);
        }
      }
      sizeChartColumns = Array.from(headerSet).map((h) => ({
        id: `sc-${i}-${h}`,
        header: h,
      }));

      for (const row of rawChart) {
        if (!row || typeof row !== 'object') continue;
        const r = row as { label: string; values: Record<string, string> };
        const matchingValue = values.find(
          (fv) => fv.label.toLowerCase() === r.label?.toLowerCase(),
        );
        if (matchingValue) {
          sizeChartData[matchingValue.id] = {};
          for (const col of sizeChartColumns) {
            sizeChartData[matchingValue.id][col.id] = r.values?.[col.header] ?? '';
          }
        }
      }
    }

    const defaultLabel = String(o.defaultLabel ?? '');

    return {
      id: `vr-${i}-${label}`, label, defaultLabel, kind, values,
      sizeChartEnabled, sizeChartColumns, sizeChartData,
    };
  });
}
