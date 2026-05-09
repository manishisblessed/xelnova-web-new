import type { Coupon } from '@prisma/client';

/** Lines after product prices are resolved (GST-inclusive unit price). */
export type CouponScopeLine = {
  price: number;
  quantity: number;
  categoryId: string;
  sellerId: string;
};

export function eligibleSubtotalForCoupon(coupon: Coupon, lines: CouponScopeLine[]): number {
  if (coupon.scope === 'category' && coupon.categoryId) {
    return lines
      .filter((l) => l.categoryId === coupon.categoryId)
      .reduce((s, l) => s + l.price * l.quantity, 0);
  }
  if (coupon.scope === 'seller' && coupon.sellerId) {
    return lines
      .filter((l) => l.sellerId === coupon.sellerId)
      .reduce((s, l) => s + l.price * l.quantity, 0);
  }
  return lines.reduce((s, l) => s + l.price * l.quantity, 0);
}

export function discountFromCoupon(coupon: Coupon, eligibleSubtotal: number): number {
  if (coupon.discountType === 'PERCENTAGE') {
    return Math.min(
      Math.round((eligibleSubtotal * coupon.discountValue) / 100),
      coupon.maxDiscount ?? Infinity,
    );
  }
  return Math.min(coupon.discountValue, eligibleSubtotal);
}
