import type { Order, OrderItem } from "@xelnova/api";

type ItemWithProduct = OrderItem & {
  product?: OrderItem["product"] & {
    isReturnable?: boolean;
    isReplaceable?: boolean;
    returnWindow?: number;
    replacementWindow?: number | null;
    returnPolicyPreset?: string | null;
  };
};

export interface ReturnEligibility {
  canReturn: boolean;
  canReplace: boolean;
  daysSinceDelivery: number;
  returnLimit: number;
  replLimit: number;
  daysLeftToReturn: number;
  daysLeftToReplace: number;
  hasNonReturnable: boolean;
  hasReplacementOnly: boolean;
}

/**
 * Computes return / replacement eligibility for an order. Returns null when
 * the order is not yet delivered (no decision possible). Mirrors the logic
 * used inside the order detail page so list and detail stay consistent.
 */
export function getReturnEligibility(order: Order | null | undefined): ReturnEligibility | null {
  if (!order || order.status.toUpperCase() !== "DELIVERED") return null;
  const items = (Array.isArray(order.items) ? order.items : []) as ItemWithProduct[];
  if (!items.length) return null;

  const deliveredAt = order.shipment?.deliveredAt
    ? new Date(order.shipment.deliveredAt)
    : new Date(order.updatedAt || order.createdAt);
  const days = Math.floor((Date.now() - deliveredAt.getTime()) / (24 * 60 * 60 * 1000));

  const hasNonReturnable = items.some((i) => i.product?.returnPolicyPreset === "NON_RETURNABLE");
  const hasReplacementOnly = items.some((i) => i.product?.returnPolicyPreset === "REPLACEMENT_ONLY");

  const allReturnable =
    !hasNonReturnable && !hasReplacementOnly && items.every((i) => i.product?.isReturnable !== false);
  const allReplaceable = !hasNonReturnable && items.every((i) => !!i.product?.isReplaceable);

  const returnLimit = Math.min(...items.map((i) => Number(i.product?.returnWindow ?? 7)));
  const replLimit = Math.min(
    ...items.map((i) => Number(i.product?.replacementWindow ?? i.product?.returnWindow ?? 7)),
  );

  return {
    canReturn: allReturnable && days <= returnLimit,
    canReplace: allReplaceable && days <= replLimit,
    daysSinceDelivery: days,
    returnLimit,
    replLimit,
    daysLeftToReturn: Math.max(0, returnLimit - days),
    daysLeftToReplace: Math.max(0, replLimit - days),
    hasNonReturnable,
    hasReplacementOnly,
  };
}
