import {
  CheckCircle2,
  Clock,
  CreditCard,
  Package,
  PackageCheck,
  RotateCcw,
  Truck,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';

/** Visual config + icon for each backend order status string. */
export interface OrderStatusConfig {
  label: string;
  /** Foreground / accent color used for icons and the badge text. */
  color: string;
  /** Soft background hex for the badge pill. */
  background: string;
  Icon: LucideIcon;
  /** Where this state sits on the linear timeline (0..4). -1 = not on timeline. */
  step: number;
}

const ORDER_STATUSES: Record<string, OrderStatusConfig> = {
  PENDING: {
    label: 'Pending',
    color: '#b07a00',
    background: '#fffbeb',
    Icon: Clock,
    step: 0,
  },
  PROCESSING: {
    label: 'Processing',
    color: '#2563eb',
    background: '#eff6ff',
    Icon: CreditCard,
    step: 1,
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: '#0c831f',
    background: '#ecfdf3',
    Icon: CheckCircle2,
    step: 2,
  },
  SHIPPED: {
    label: 'Shipped',
    color: '#1f8f89',
    background: '#e6f7f6',
    Icon: Truck,
    step: 3,
  },
  DELIVERED: {
    label: 'Delivered',
    color: '#047857',
    background: '#ecfdf5',
    Icon: PackageCheck,
    step: 4,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: '#b91c1c',
    background: '#fef2f2',
    Icon: XCircle,
    step: -1,
  },
  RETURNED: {
    label: 'Returned',
    color: '#5a6478',
    background: '#f1f5f9',
    Icon: RotateCcw,
    step: -1,
  },
  REFUNDED: {
    label: 'Refunded',
    color: '#5a6478',
    background: '#f1f5f9',
    Icon: RotateCcw,
    step: -1,
  },
};

const FALLBACK: OrderStatusConfig = {
  label: 'In progress',
  color: '#5a6478',
  background: '#f1f5f9',
  Icon: Package,
  step: -1,
};

export function orderStatusConfig(status: string | null | undefined): OrderStatusConfig {
  if (!status) return FALLBACK;
  return ORDER_STATUSES[status.toUpperCase()] ?? FALLBACK;
}

export const ORDER_TIMELINE_STEPS: Array<{
  key: keyof typeof ORDER_STATUSES;
  label: string;
}> = [
  { key: 'PENDING', label: 'Placed' },
  { key: 'PROCESSING', label: 'Confirmed' },
  { key: 'CONFIRMED', label: 'Packed' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export interface PaymentStatusConfig {
  label: string;
  color: string;
  background: string;
}

const PAYMENT_STATUSES: Record<string, PaymentStatusConfig> = {
  PENDING: { label: 'Payment pending', color: '#b07a00', background: '#fffbeb' },
  PROCESSING: { label: 'Verifying payment', color: '#2563eb', background: '#eff6ff' },
  PAID: { label: 'Paid', color: '#047857', background: '#ecfdf5' },
  FAILED: { label: 'Payment failed', color: '#b91c1c', background: '#fef2f2' },
  REFUNDED: { label: 'Refunded', color: '#5a6478', background: '#f1f5f9' },
};

export function paymentStatusConfig(
  status: string | null | undefined,
): PaymentStatusConfig {
  if (!status) return { label: 'Unknown', color: '#5a6478', background: '#f1f5f9' };
  return PAYMENT_STATUSES[status.toUpperCase()] ?? {
    label: status,
    color: '#5a6478',
    background: '#f1f5f9',
  };
}

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pickup pending',
  BOOKED: 'Booked with courier',
  PICKED_UP: 'Picked up',
  IN_TRANSIT: 'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  RTO: 'Returning to origin',
  RTO_DELIVERED: 'Returned to origin',
  EXCEPTION: 'Exception',
  CANCELLED: 'Cancelled',
};

export function shipmentStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return SHIPMENT_STATUS_LABELS[status.toUpperCase()] ?? status;
}
