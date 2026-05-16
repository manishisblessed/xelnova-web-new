import type { Order, OrderItem } from '@xelnova/api';

export const RETURN_REASONS: { value: string; label: string }[] = [
  { value: 'DEFECTIVE', label: 'Damaged or defective' },
  { value: 'WRONG_ITEM', label: 'Wrong item received' },
  { value: 'NOT_AS_DESCRIBED', label: 'Not as described' },
  { value: 'SIZE_FIT', label: 'Size or fit issue' },
  { value: 'CHANGED_MIND', label: 'Changed mind' },
  { value: 'OTHER', label: 'Other' },
];

const DEFAULT_WINDOW_DAYS = 7;

interface ReturnEligibility {
  /** Can a return-of-money or replacement be requested at all? */
  eligible: boolean;
  /** Subset of items still inside the policy window. */
  eligibleItems: OrderItem[];
  /** True when the per-item product allows replacement. */
  replacementAllowed: boolean;
  /** Reason text to surface when `eligible === false`. */
  reason?: string;
  /** Days remaining until the window closes (>= 0). */
  daysLeft?: number;
}

function deliveredAtFor(order: Order): Date | null {
  if (order.shipment?.deliveredAt) return new Date(order.shipment.deliveredAt);
  if ((order.status ?? '').toUpperCase() === 'DELIVERED') {
    return new Date(order.updatedAt ?? order.createdAt);
  }
  return null;
}

/**
 * Mirrors the server-side gating for return / replacement creation. Pure
 * function so it's safe to call from the order detail screen without an
 * extra round-trip.
 */
export function returnEligibility(order: Order): ReturnEligibility {
  const status = (order.status ?? '').toUpperCase();
  if (status === 'CANCELLED') {
    return { eligible: false, eligibleItems: [], replacementAllowed: false, reason: 'Cancelled orders can\'t be returned.' };
  }
  if (!['DELIVERED', 'RETURNED', 'REFUNDED'].includes(status)) {
    return {
      eligible: false,
      eligibleItems: [],
      replacementAllowed: false,
      reason: 'You can request a return after the order is delivered.',
    };
  }
  const delivered = deliveredAtFor(order);
  if (!delivered) {
    return {
      eligible: false,
      eligibleItems: [],
      replacementAllowed: false,
      reason: 'We couldn\'t find a delivery date for this order.',
    };
  }

  const items = order.items ?? [];
  const eligibleItems = items.filter((it) => {
    const product = it.product as
      | {
          isReturnable?: boolean;
          returnPolicyPreset?: string | null;
          returnWindow?: number;
        }
      | undefined;
    if (product?.isReturnable === false) return false;
    if (product?.returnPolicyPreset === 'NON_RETURNABLE') return false;
    return true;
  });

  if (eligibleItems.length === 0) {
    return {
      eligible: false,
      eligibleItems: [],
      replacementAllowed: false,
      reason: 'These items are non-returnable.',
    };
  }

  const window = Math.min(
    ...eligibleItems.map((it) => {
      const w = (it.product as { returnWindow?: number } | undefined)?.returnWindow;
      return typeof w === 'number' && w > 0 ? w : DEFAULT_WINDOW_DAYS;
    }),
  );
  const expiry = new Date(delivered);
  expiry.setDate(expiry.getDate() + window);
  const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86_400_000);
  if (daysLeft <= 0) {
    return {
      eligible: false,
      eligibleItems: [],
      replacementAllowed: false,
      reason: 'The return window has ended for this order.',
    };
  }

  const replacementAllowed = eligibleItems.some(
    (it) =>
      (it.product as { isReplaceable?: boolean } | undefined)?.isReplaceable !==
      false,
  );

  return {
    eligible: true,
    eligibleItems,
    replacementAllowed,
    daysLeft,
  };
}
