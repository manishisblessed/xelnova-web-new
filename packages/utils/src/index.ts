import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = "INR"
): string {
  if (currency === "INR") {
    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

export function generateOrderNumber(): string {
  const now = new Date();
  const datePart =
    String(now.getFullYear()).slice(-2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");

  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const suffix = Array.from(
    { length: 3 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");

  return `XN${datePart}${seq}${suffix}`;
}

export function calculateDiscount(
  price: number,
  comparePrice: number
): number {
  if (comparePrice <= 0 || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

/** Default GST % when product has no rate (used by invoice/report tax derivation). */
export const DEFAULT_GST_PERCENT = 18;

/** Standard GST slabs (India) — use for listing UI so sellers pick a rate instead of typing. */
export const GST_SLAB_PERCENTS = [0, 5, 12, 18, 28] as const;

/**
 * Pricing contract (changed Apr 2026):
 *   `Product.price` and `OrderItem.price` are stored as the **GST-inclusive
 *   selling price** — exactly what the seller types and exactly what the buyer
 *   pays. No conversion happens at the API boundary.
 *
 * The two helpers below are kept as identity functions purely so existing
 * call sites (cart, checkout, product page, header, wishlist, JSON-LD, etc.)
 * keep compiling. Do not reintroduce GST math here — derive taxable and tax
 * via {@link taxableFromInclusive} / {@link gstAmountFromInclusive} only on
 * invoices and tax reports.
 */
export function priceInclusiveOfGst(
  price: number,
  _gstRatePercent?: number | null,
): number {
  if (!price || price <= 0) return 0;
  return price;
}

export function priceExclusiveFromInclusive(
  price: number,
  _gstRatePercent?: number | null,
): number {
  if (!price || price <= 0) return 0;
  return price;
}

/**
 * Back-out the taxable value from a GST-inclusive amount, for invoices and
 * GST reports. `inclusive = taxable + taxable × gst/100`, so
 * `taxable = inclusive × 100 / (100 + gst)`.
 */
export function taxableFromInclusive(
  inclusive: number,
  gstRatePercent?: number | null,
): number {
  if (!inclusive || inclusive <= 0) return 0;
  const r = gstRatePercent ?? DEFAULT_GST_PERCENT;
  if (r <= 0) return inclusive;
  return (inclusive * 100) / (100 + r);
}

/**
 * GST component of a GST-inclusive amount = inclusive − taxable.
 */
export function gstAmountFromInclusive(
  inclusive: number,
  gstRatePercent?: number | null,
): number {
  if (!inclusive || inclusive <= 0) return 0;
  return inclusive - taxableFromInclusive(inclusive, gstRatePercent);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatNumber(num: number): string {
  return num.toLocaleString("en-IN");
}

/**
 * Picks a sensible display label for a product variant group, defending the UI
 * against sellers who pick the wrong attribute type at upload time (e.g. a
 * "Colour" attribute containing age values like "2-3 YEAR"). Heuristic:
 *
 *  - If any option carries an explicit `hex`, treat as a real colour attribute
 *    and keep the seller's label as-is.
 *  - Otherwise inspect the option labels for size/age/dimension patterns and
 *    return a better label ("Age", "Size", "Capacity") instead of the
 *    misleading seller-provided one.
 *
 * The original label is preserved when it doesn't conflict with the inferred
 * intent — we only override generic "Colour"/"Color"/"Variant" labels.
 */
export function inferVariantDisplayLabel(
  sellerLabel: string,
  options: Array<{ label: string; hex?: string | null }>,
): string {
  const trimmed = (sellerLabel || "").trim();
  const hasHex = options.some((o) => !!o.hex);
  if (hasHex) return trimmed || "Colour";

  const joined = options.map((o) => o.label).join(" ").toLowerCase();

  const looksGeneric = /^(colou?r|variant|option|type)$/i.test(trimmed);

  const inferred = (() => {
    if (/\b(year|yr|yrs|month|mo|age)\b/.test(joined)) return "Age";
    if (/\b(xs|s|m|l|xl|xxl|xxxl|small|medium|large)\b/.test(joined)) return "Size";
    if (/\b(\d+(\.\d+)?\s*(cm|mm|inch|in|ft|m)\b)/.test(joined)) return "Size";
    if (/\b(\d+(\.\d+)?\s*(ml|l|litre|liter|oz|gallon|gal)\b)/.test(joined)) return "Capacity";
    if (/\b(\d+(\.\d+)?\s*(g|gm|gram|kg|grams|kilogram)\b)/.test(joined)) return "Weight";
    if (/\b(\d+\s*(gb|tb|mb))\b/.test(joined)) return "Storage";
    return null;
  })();

  if (inferred && (looksGeneric || /colou?r/i.test(trimmed))) {
    return inferred;
  }

  return trimmed || "Variant";
}

/**
 * Maps raw API / network errors to user-friendly messages.
 * Pass a contextual `fallback` for the specific action (e.g. "Unable to save address").
 */
export function friendlyError(err: unknown, fallback: string = "Something went wrong. Please try again."): string {
  const status = (err as any)?.response?.status;
  if (status === 401 || status === 403) {
    const msg: string = (err as any)?.response?.data?.message ?? "";
    if (/token|unauthorized|unauthenticated/i.test(msg) || /invalid or expired/i.test(msg)) {
      return "Please sign in to continue.";
    }
    if (msg) return msg;
  }
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status >= 500) return "Our servers are having trouble. Please try again shortly.";
  if ((err as any)?.code === "ERR_NETWORK" || (err as any)?.message === "Network Error") {
    return "Network error. Please check your connection and try again.";
  }
  return fallback;
}
