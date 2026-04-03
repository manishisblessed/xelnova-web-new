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

export const MAX_PRODUCT_IMAGES = 10;

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

export function newFormValue(): FormVariantValue {
  return {
    id: `fv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    hex: '',
    images: [],
    price: '',
    compareAtPrice: '',
    stock: '',
    sku: '',
  };
}

export function newFormRow(): FormVariantRow {
  return {
    id: `vr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: 'Colour',
    defaultLabel: '',
    kind: 'color',
    values: [newFormValue()],
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

export function formRowsToVariantGroups(rows: FormVariantRow[]): VariantGroupJson[] {
  const usedTypes = new Set<string>();
  return rows
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

export function variantGroupsToFormRows(raw: unknown): FormVariantRow[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((v: unknown, i: number) => {
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
