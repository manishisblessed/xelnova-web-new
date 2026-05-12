/**
 * Chatbot intent detection and response templates.
 *
 * Each intent has keyword patterns and a response builder.
 * Order-specific intents receive live data from the database;
 * general intents return static guidance.
 */

export type ChatIntent =
  | 'ORDER_STATUS'
  | 'SHIPPING_DETAILS'
  | 'RETURN_REPLACEMENT'
  | 'REFUND_STATUS'
  | 'PAYMENT_ISSUES'
  | 'ACCOUNT_HELP'
  | 'UNKNOWN';

interface IntentRule {
  intent: ChatIntent;
  /** At least one pattern must match (case-insensitive). */
  patterns: RegExp[];
  /** True when the intent needs a linked order to produce a useful answer. */
  needsOrder: boolean;
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: 'ORDER_STATUS',
    patterns: [
      /\border(?:er)?\s*status/i,
      /\bwhere\b.*\border/i,
      /\btrack(?:ing)?\b/i,
      /\bmy\s+order/i,
      /\border\s+update/i,
      /\bwhen\s+will\b.*\b(?:arrive|deliver|reach|come)/i,
      /\bhas\s+my\s+order/i,
    ],
    needsOrder: true,
  },
  {
    intent: 'SHIPPING_DETAILS',
    patterns: [
      /\bshipp?ing\b/i,
      /\bdelivery\b.*\b(?:time|date|charge|fee|status)/i,
      /\bcourier\b/i,
      /\bawb\b/i,
      /\bdispatch/i,
      /\best(?:imated)?\s+delivery/i,
      /\bshipment\b/i,
    ],
    needsOrder: true,
  },
  {
    intent: 'RETURN_REPLACEMENT',
    patterns: [
      /\breturn\b/i,
      /\breplace(?:ment)?\b/i,
      /\bexchange\b/i,
      /\bpickup\s+for\s+return/i,
      /\breverse\s+pickup/i,
      /\bhow\s+(?:to|do\s+i)\s+return/i,
      /\breturn\s+(?:status|request|policy)/i,
    ],
    needsOrder: true,
  },
  {
    intent: 'REFUND_STATUS',
    patterns: [
      /\brefund\b/i,
      /\bmoney\s+back/i,
      /\bwhen\b.*\brefund/i,
      /\brefund\s+status/i,
      /\bcredit(?:ed)?\s+back/i,
    ],
    needsOrder: true,
  },
  {
    intent: 'PAYMENT_ISSUES',
    patterns: [
      /\bpayment\b.*\b(?:fail|issue|problem|error|stuck|pending|declined)/i,
      /\btransaction\s+fail/i,
      /\bmoney\s+debit/i,
      /\bdouble\s+(?:charge|debit)/i,
      /\bpaid\s+but/i,
      /\bpayment\s+not\s+(?:going|working)/i,
    ],
    needsOrder: false,
  },
  {
    intent: 'ACCOUNT_HELP',
    patterns: [
      /\blogin\b/i,
      /\bpassword\b/i,
      /\bforgot\b.*\bpassword/i,
      /\baccount\b.*\b(?:lock|block|issue|help|access)/i,
      /\breset\b.*\bpassword/i,
      /\bprofile\b.*\b(?:update|change|edit)/i,
      /\bemail\b.*\b(?:change|update|verify)/i,
      /\bphone\b.*\b(?:change|update|verify)/i,
      /\bsign\s*(?:in|up)\b/i,
      /\bcan'?t\s+log\s*in/i,
    ],
    needsOrder: false,
  },
];

export function detectIntent(message: string): { intent: ChatIntent; needsOrder: boolean } {
  const text = message.trim();
  for (const rule of INTENT_RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      return { intent: rule.intent, needsOrder: rule.needsOrder };
    }
  }
  return { intent: 'UNKNOWN', needsOrder: false };
}

// ─── Order-status helpers ───

const STATUS_FRIENDLY: Record<string, string> = {
  PENDING: 'Pending — we are processing your order.',
  PROCESSING: 'Processing — your order is being prepared.',
  CONFIRMED: 'Confirmed — your order has been confirmed and is awaiting dispatch.',
  SHIPPED: 'Shipped — your order is on the way!',
  DELIVERED: 'Delivered — your order has been delivered.',
  CANCELLED: 'Cancelled.',
  RETURNED: 'Returned.',
  REFUNDED: 'Refunded.',
};

const SHIPMENT_STATUS_FRIENDLY: Record<string, string> = {
  PENDING: 'Shipment is being prepared.',
  BOOKED: 'Shipment has been booked with the courier.',
  PICKUP_SCHEDULED: 'Courier pickup is scheduled.',
  PICKED_UP: 'The courier has picked up your package.',
  IN_TRANSIT: 'Your package is in transit.',
  OUT_FOR_DELIVERY: 'Out for delivery — arriving today!',
  DELIVERED: 'Delivered successfully.',
  RTO_INITIATED: 'Return to origin initiated by the courier.',
  RTO_DELIVERED: 'Package returned to the seller.',
  CANCELLED: 'Shipment was cancelled.',
};

// ─── Response builders ───

export interface OrderContext {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: Date;
  shipment?: {
    shipmentStatus: string;
    courierProvider: string | null;
    awbNumber: string | null;
    trackingUrl: string | null;
    pickupDate: Date | null;
    deliveredAt: Date | null;
  } | null;
  returnRequests?: {
    status: string;
    kind: string;
    refundAmount: number | null;
    reverseAwb: string | null;
    reverseTrackingUrl: string | null;
  }[];
}

export function buildOrderStatusReply(order: OrderContext): string {
  const lines: string[] = [];
  lines.push(`**Order #${order.orderNumber}**`);
  lines.push(`Status: ${STATUS_FRIENDLY[order.status] || order.status}`);

  if (order.shipment) {
    const s = order.shipment;
    lines.push('');
    lines.push(`Shipment: ${SHIPMENT_STATUS_FRIENDLY[s.shipmentStatus] || s.shipmentStatus}`);
    if (s.courierProvider) lines.push(`Courier: ${s.courierProvider}`);
    if (s.awbNumber) lines.push(`AWB: ${s.awbNumber}`);
    if (s.trackingUrl) lines.push(`Track here: ${s.trackingUrl}`);
    if (s.deliveredAt) {
      lines.push(`Delivered on: ${new Date(s.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`);
    }
  } else if (['PENDING', 'PROCESSING', 'CONFIRMED'].includes(order.status)) {
    lines.push('Your order has not been dispatched yet. It will be shipped soon.');
  }

  return lines.join('\n');
}

export function buildShippingReply(order: OrderContext): string {
  if (!order.shipment) {
    if (['PENDING', 'PROCESSING', 'CONFIRMED'].includes(order.status)) {
      return `Your order #${order.orderNumber} has not been shipped yet. Once the seller dispatches it, you'll receive a tracking update.`;
    }
    return `No shipment information is available for order #${order.orderNumber}.`;
  }

  const s = order.shipment;
  const lines: string[] = [];
  lines.push(`**Shipping details for #${order.orderNumber}**`);
  lines.push(`Status: ${SHIPMENT_STATUS_FRIENDLY[s.shipmentStatus] || s.shipmentStatus}`);
  if (s.courierProvider) lines.push(`Courier: ${s.courierProvider}`);
  if (s.awbNumber) lines.push(`AWB: ${s.awbNumber}`);
  if (s.trackingUrl) lines.push(`Track: ${s.trackingUrl}`);
  if (s.pickupDate) {
    lines.push(`Pickup: ${new Date(s.pickupDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`);
  }
  return lines.join('\n');
}

export function buildReturnReply(order: OrderContext): string {
  const returns = order.returnRequests || [];
  if (returns.length === 0) {
    return `No return or replacement requests found for order #${order.orderNumber}. You can initiate a return from the order details page if the item is eligible.`;
  }

  const lines: string[] = [`**Return/Replacement for #${order.orderNumber}**`];
  for (const r of returns) {
    lines.push(`• ${r.kind === 'REPLACEMENT' ? 'Replacement' : 'Return'} — Status: ${r.status}`);
    if (r.refundAmount != null && r.refundAmount > 0) {
      lines.push(`  Refund amount: ₹${r.refundAmount.toLocaleString('en-IN')}`);
    }
    if (r.reverseAwb) lines.push(`  Reverse AWB: ${r.reverseAwb}`);
    if (r.reverseTrackingUrl) lines.push(`  Track return: ${r.reverseTrackingUrl}`);
  }
  return lines.join('\n');
}

export function buildRefundReply(order: OrderContext): string {
  const returns = (order.returnRequests || []).filter((r) => r.status === 'REFUNDED');
  const lines: string[] = [];

  if (order.paymentStatus === 'REFUNDED') {
    lines.push(`Order #${order.orderNumber} has been fully refunded (₹${order.total.toLocaleString('en-IN')}).`);
    lines.push('Refunds typically take 5–7 business days to reflect in your account.');
    return lines.join('\n');
  }

  if (returns.length > 0) {
    lines.push(`**Refund status for #${order.orderNumber}**`);
    for (const r of returns) {
      lines.push(`• ₹${(r.refundAmount ?? 0).toLocaleString('en-IN')} — Refunded`);
    }
    lines.push('Refunds typically take 5–7 business days to reflect.');
    return lines.join('\n');
  }

  if (order.status === 'CANCELLED') {
    if (order.paymentStatus === 'PAID') {
      return `Order #${order.orderNumber} was cancelled. Your refund is being processed and should arrive within 5–7 business days.`;
    }
    return `Order #${order.orderNumber} was cancelled. No payment was captured, so you will not be charged.`;
  }

  return `No refund has been processed for order #${order.orderNumber} yet. If you've requested a return, the refund will be initiated once the return is approved.`;
}

export function buildPaymentIssuesReply(): string {
  return [
    '**Payment troubleshooting:**',
    '',
    '1. **Failed transaction** — Retry checkout with the same or a different payment method. If money was debited but no order was created, your bank typically reverses it within 3–5 business days.',
    '2. **Double charge** — Check your bank statement after 24 hours. Duplicate holds are usually released automatically. If not, contact your bank or reach out to us.',
    '3. **UPI/Netbanking stuck** — Close the payment window and retry. Do not press back during payment.',
    '4. **Wallet payment** — Ensure sufficient balance in your Xelnova wallet before checkout.',
    '',
    'If the issue persists, type **"talk to support"** and we\'ll connect you with our team.',
  ].join('\n');
}

export function buildAccountHelpReply(): string {
  return [
    '**Account help:**',
    '',
    '• **Forgot password** — Use "Forgot Password" on the login page. A reset link will be sent to your registered email.',
    '• **Update email/phone** — Go to Account → Profile to update your contact details.',
    '• **Account locked** — After multiple failed login attempts, wait 15 minutes and try again.',
    '• **Can\'t receive OTP** — Ensure your phone number is correct and has network coverage. Check if messages are blocked.',
    '',
    'If you still need help, type **"talk to support"** to connect with our team.',
  ].join('\n');
}

export const ESCALATION_PROMPT =
  "I wasn't able to fully resolve your query. I've created a support ticket so our team can help you directly.";

export const NEEDS_ORDER_PROMPT =
  'I can help with that! Could you please provide your order number so I can look up the details?';
