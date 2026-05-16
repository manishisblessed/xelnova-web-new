/**
 * Resolve selected variant options from the seller inventory `variants` JSON
 * and the checkout/cart composite key (values joined with "-").
 */

export type VariantOption = {
  value?: string;
  label?: string;
  sku?: string;
  stock?: number;
  price?: number;
  compareAtPrice?: number;
  images?: string[];
  hex?: string;
  [key: string]: unknown;
};

export type VariantGroup = {
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

export function optionMatchesVariantToken(opt: VariantOption, token: string): boolean {
  const t = token.trim();
  if (!t) return false;
  const value = opt.value != null ? String(opt.value) : '';
  const label = opt.label != null ? String(opt.label) : '';
  return (
    value === t ||
    label === t ||
    normKey(value) === normKey(t) ||
    normKey(label) === normKey(t)
  );
}

export function parseVariantTokens(variantStr: string | undefined): Set<string> {
  return new Set(
    (variantStr ?? '')
      .split('-')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function findMatchingOption(
  group: VariantGroup,
  parts: Set<string>,
  fullVariantStr?: string,
): VariantOption | null {
  if (!Array.isArray(group.options)) return null;
  // Try matching the full (un-split) variant string first — handles option
  // values that themselves contain the '-' separator character.
  if (fullVariantStr) {
    for (const opt of group.options) {
      if (optionMatchesVariantToken(opt, fullVariantStr)) {
        return opt;
      }
    }
  }
  // Fall back to token-by-token matching (multi-group selections like "red-large").
  for (const opt of group.options) {
    for (const part of parts) {
      if (optionMatchesVariantToken(opt, part)) {
        return opt;
      }
    }
  }
  return null;
}

/**
 * Same as `findMatchingOption` but mutates `remaining` to delete the token
 * that produced the match (and any sub-tokens of a multi-word match, e.g.
 * the option label "Off- White" consumes both "off" and "white" when the
 * checkout sent a token-split variant string like "off-white-s").
 *
 * Used by the snapshot builder so the same dash-token cannot be reused by
 * two separate groups — which is what produced the bogus
 * `{ Chikoo: "S", "Off- White": "S" }` snapshot for the Khadi Kurtaset
 * order (seller had two `kind: "color"` rows, each holding the size
 * options; both groups' "S" option matched the single "s" token).
 */
function findMatchingOptionConsuming(
  group: VariantGroup,
  remaining: Set<string>,
  fullVariantStr?: string,
): VariantOption | null {
  if (!Array.isArray(group.options)) return null;

  // Full-string match first — option labels like "Off- White" survive even
  // after the dash-split mangling done by parseVariantTokens.
  if (fullVariantStr) {
    for (const opt of group.options) {
      if (optionMatchesVariantToken(opt, fullVariantStr)) {
        consumeOptionTokens(opt, remaining);
        return opt;
      }
    }
  }

  for (const opt of group.options) {
    for (const part of remaining) {
      if (optionMatchesVariantToken(opt, part)) {
        remaining.delete(part);
        consumeOptionTokens(opt, remaining);
        return opt;
      }
    }
  }
  return null;
}

/**
 * When an option's normKey is multi-token (e.g. "off-white"), drop every
 * sub-token from `remaining` so a later group can't latch onto "off" or
 * "white" as if they were independent selections.
 */
function consumeOptionTokens(opt: VariantOption, remaining: Set<string>): void {
  const candidates = [
    opt.value != null ? String(opt.value) : '',
    opt.label != null ? String(opt.label) : '',
  ];
  for (const c of candidates) {
    const k = normKey(c);
    if (!k) continue;
    for (const sub of k.split('-')) {
      const t = sub.trim();
      if (t) remaining.delete(t);
    }
  }
}

/**
 * Derive the canonical kind ("color" / "size" / something else) from a
 * group's `type`. Seller-form serialization appends "-1", "-2", ... to
 * deduplicate type strings when the seller adds two rows of the same kind
 * (e.g. two "color" rows), so we strip that suffix here.
 */
function getGroupKind(group: VariantGroup): string {
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
 * Repair legacy / malformed `variants` JSON so the snapshot builder always
 * sees the intended shape:
 *
 *   { type: "color", label: "Colour", options: [ {label: "Chikoo", ...}, ... ] }
 *   { type: "size",  label: "Size",   options: [ {label: "S",      ...}, ... ] }
 *
 * Some products in production were saved with the inverted shape — a
 * separate `color` group per colour, each holding the SIZE values as its
 * options. That made the order-line snapshot emit duplicate attribute
 * entries (`{ Chikoo: "S", "Off- White": "S" }`) and the wrong SKU.
 *
 * This function detects N>1 groups of the same kind ("color" or "size")
 * and reshapes them into:
 *   - one canonical group whose options are the source group LABELS
 *     (so the colour names become real colour options), and
 *   - one canonical "size" / "Option" group whose options are the UNION
 *     of the inner options across the source groups (deduped by value).
 *
 * Groups of differing kinds are passed through unchanged.
 */
export function normalizeVariantGroups(groups: VariantGroup[]): VariantGroup[] {
  if (!Array.isArray(groups) || groups.length === 0) return groups ?? [];

  const buckets = new Map<string, VariantGroup[]>();
  const order: string[] = [];
  for (const g of groups) {
    if (!g || typeof g !== 'object') continue;
    const kind = getGroupKind(g);
    if (!buckets.has(kind)) {
      buckets.set(kind, []);
      order.push(kind);
    }
    buckets.get(kind)!.push(g);
  }

  const out: VariantGroup[] = [];
  for (const kind of order) {
    const list = buckets.get(kind)!;
    if (list.length <= 1) {
      out.push(...list);
      continue;
    }

    // Multiple groups of the same kind ⇒ malformed. Reshape them.
    const labelOptions: VariantOption[] = [];
    const innerByValue = new Map<string, VariantOption>();

    for (const g of list) {
      const rawLabel = String(g.label ?? '').trim();
      if (rawLabel) {
        const value = normKey(rawLabel);
        // Pull common metadata from the first inner option of this group
        // — that's where the seller typically attached the colour SKU /
        // hex / images when treating each colour as its own group.
        const meta = Array.isArray(g.options) && g.options[0] ? g.options[0] : ({} as VariantOption);
        const promoted: VariantOption = {
          value,
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
        labelOptions.push(promoted);
      }

      for (const opt of g.options ?? []) {
        if (!opt) continue;
        const k = normKey(opt.value ?? opt.label ?? '');
        if (!k) continue;
        if (!innerByValue.has(k)) {
          innerByValue.set(k, { ...opt, value: k });
        }
      }
    }

    if (labelOptions.length > 0) {
      out.push({
        type: kind,
        label: canonicalKindLabel(kind),
        options: labelOptions,
      });
    }

    if (innerByValue.size > 0) {
      // The inner dimension is unknown — could be size or anything else.
      // Default to "size" when the duplicated parent kind was "color"
      // (the overwhelmingly common case in production data); fall back
      // to a neutral label otherwise.
      const innerKind = kind === 'color' ? 'size' : 'other';
      // Avoid clobbering an existing canonical group of the same inner
      // kind that may follow.
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

  return out;
}

export interface VariantLineSnapshot {
  productImage: string | null;
  variantSku: string | null;
  variantAttributes: Record<string, string>;
  variantSummary: string;
}

/**
 * Builds immutable snapshot fields for an order line so seller/consumer
 * views stay correct even if the live Product.variants JSON changes later.
 *
 * Two safety nets guard against malformed product data:
 *   1. `normalizeVariantGroups` reshapes duplicate-kind groups into the
 *      intended canonical structure before matching.
 *   2. The consuming matcher prevents a single variant token from being
 *      re-used across multiple groups, so the resulting `variantAttributes`
 *      map can never contain phantom duplicate entries.
 */
export function buildVariantLineSnapshot(
  variants: unknown,
  variantStr: string | undefined,
  fallbackProductImage: string | null | undefined,
): VariantLineSnapshot {
  const parts = parseVariantTokens(variantStr);
  if (!variantStr || parts.size === 0 || !Array.isArray(variants)) {
    return {
      productImage: fallbackProductImage ?? null,
      variantSku: null,
      variantAttributes: {},
      variantSummary: '',
    };
  }

  const groups = normalizeVariantGroups(variants as VariantGroup[]);
  const attributes: Record<string, string> = {};
  const seenAttributeKeys = new Set<string>();
  let variantSku: string | null = null;
  let productImage: string | null = null;

  const remaining = new Set(parts);

  for (const group of groups) {
    const opt = findMatchingOptionConsuming(group, remaining, variantStr);
    if (!opt) continue;
    const rawKey = String(group.label || group.type || 'Option').trim();
    const display = String(opt.label || opt.value || '').trim();
    if (!display || display === '__default__') continue;

    // De-duplicate by normalized key so two groups with the same label
    // (e.g. both "Colour") can never produce two entries that look the
    // same in the seller / consumer UI.
    let attrKey = rawKey || 'Option';
    let suffix = 1;
    while (seenAttributeKeys.has(normKey(attrKey))) {
      suffix += 1;
      attrKey = `${rawKey} ${suffix}`;
    }
    seenAttributeKeys.add(normKey(attrKey));
    attributes[attrKey] = display;

    if (opt.sku != null && String(opt.sku).trim()) {
      variantSku = String(opt.sku).trim();
    }
    // Prefer the first variant-group that carries a specific image (typically colour),
    // so a later group (e.g. size) cannot overwrite with the wrong gallery asset.
    const img = opt.images?.[0];
    if (!productImage && img && String(img).trim()) {
      productImage = String(img).trim();
    }
  }

  if (!productImage) {
    productImage = fallbackProductImage ?? null;
  }

  const summaryParts = Object.entries(attributes).map(([k, v]) => `${k}: ${v}`);
  const variantSummary = summaryParts.length > 0 ? summaryParts.join('; ') : variantStr;

  return {
    productImage,
    variantSku,
    variantAttributes: attributes,
    variantSummary,
  };
}
