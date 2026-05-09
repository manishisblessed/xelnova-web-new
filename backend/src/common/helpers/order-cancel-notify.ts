/**
 * Customer-facing cancellation messaging must match what actually happened:
 * no charge vs wallet credit vs Razorpay source refund vs refund errors.
 */
export type OrderCancelledRefundOutcome =
  | 'NO_PAYMENT'
  | 'WALLET_CREDITED'
  | 'ORIGINAL_METHOD_PENDING'
  | 'REFUND_FAILED'
  /** Admin (or other) manual status change — refund may not have been run */
  | 'STATUS_UPDATE_UNCONFIRMED';

export interface OrderCancelledNotifyParams {
  outcome: OrderCancelledRefundOutcome;
  refundAmount?: number;
}

export function buildCancellationNotifyParams(
  paymentStatus: string,
  refundResult: { success: boolean; message?: string; refundId?: string } | null,
  orderTotal: number,
): OrderCancelledNotifyParams {
  if (paymentStatus !== 'PAID') {
    return { outcome: 'NO_PAYMENT' };
  }
  const refundAmount = orderTotal || 0;
  if (!refundResult?.success) {
    return { outcome: 'REFUND_FAILED', refundAmount };
  }
  if (refundResult.refundId) {
    return { outcome: 'ORIGINAL_METHOD_PENDING', refundAmount };
  }
  return { outcome: 'WALLET_CREDITED', refundAmount };
}
