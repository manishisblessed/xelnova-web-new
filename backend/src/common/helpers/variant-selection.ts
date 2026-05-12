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

export interface VariantLineSnapshot {
  productImage: string | null;
  variantSku: string | null;
  variantAttributes: Record<string, string>;
  variantSummary: string;
}

/**
 * Builds immutable snapshot fields for an order line so seller/consumer
 * views stay correct even if the live Product.variants JSON changes later.
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

  const groups = variants as VariantGroup[];
  const attributes: Record<string, string> = {};
  let variantSku: string | null = null;
  let productImage: string | null = null;

  for (const group of groups) {
    const opt = findMatchingOption(group, parts, variantStr);
    if (!opt) continue;
    const attrKey = String(group.label || group.type || 'Option').trim();
    const display = String(opt.label || opt.value || '').trim();
    if (display && display !== '__default__') {
      attributes[attrKey] = display;
    }
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
