/**
 * Resolve per-option price overrides from product `variants` JSON (seller inventory).
 * Variant keys on the order/cart are joined with "-" (e.g. "purple-large").
 */

interface VariantOption {
  value: string;
  price?: number;
  compareAtPrice?: number;
  stock?: number;
  [key: string]: unknown;
}

interface VariantGroup {
  type: string;
  options: VariantOption[];
  [key: string]: unknown;
}

export function resolveVariantPrice(variants: unknown, variantStr: string | undefined): number | undefined {
  if (!variantStr || !Array.isArray(variants)) return undefined;
  const parts = new Set(variantStr.split('-'));
  for (const group of variants as VariantGroup[]) {
    if (!Array.isArray(group?.options)) continue;
    for (const opt of group.options) {
      if (parts.has(opt.value) && typeof opt.price === 'number') return opt.price;
    }
  }
  return undefined;
}

export function resolveVariantCompareAtPrice(
  variants: unknown,
  variantStr: string | undefined,
): number | undefined {
  if (!variantStr || !Array.isArray(variants)) return undefined;
  const parts = new Set(variantStr.split('-'));
  for (const group of variants as VariantGroup[]) {
    if (!Array.isArray(group?.options)) continue;
    for (const opt of group.options) {
      if (parts.has(opt.value) && typeof opt.compareAtPrice === 'number') return opt.compareAtPrice;
    }
  }
  return undefined;
}
