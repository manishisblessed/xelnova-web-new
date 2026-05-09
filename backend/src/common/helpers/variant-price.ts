/**
 * Resolve per-option price overrides from product `variants` JSON (seller inventory).
 * Variant keys on the order/cart are joined with "-" (e.g. "purple-large").
 */

import {
  type VariantGroup,
  findMatchingOption,
  parseVariantTokens,
} from './variant-selection';

export function resolveVariantPrice(variants: unknown, variantStr: string | undefined): number | undefined {
  if (!variantStr || !Array.isArray(variants)) return undefined;
  const parts = parseVariantTokens(variantStr);
  for (const group of variants as VariantGroup[]) {
    const opt = findMatchingOption(group, parts);
    if (opt && typeof opt.price === 'number') return opt.price;
  }
  return undefined;
}

export function resolveVariantCompareAtPrice(
  variants: unknown,
  variantStr: string | undefined,
): number | undefined {
  if (!variantStr || !Array.isArray(variants)) return undefined;
  const parts = parseVariantTokens(variantStr);
  for (const group of variants as VariantGroup[]) {
    const opt = findMatchingOption(group, parts);
    if (opt && typeof opt.compareAtPrice === 'number') return opt.compareAtPrice;
  }
  return undefined;
}
