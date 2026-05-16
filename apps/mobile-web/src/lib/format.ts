/** Shared number/string formatters for mobile UI. Kept here (not in
 *  `@xelnova/ui-native`) because they're app-specific and depend on the
 *  rupee-first defaults for our customer base. */

export function formatRupees(amount: number): string {
  if (Number.isNaN(amount)) return '\u20B90';
  return `\u20B9${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatRupeesPrecise(amount: number): string {
  if (Number.isNaN(amount)) return '\u20B90.00';
  return `\u20B9${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCount(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function discountPercent(price: number, compareAt?: number | null): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
