import { api } from './client';
import type { ApiResponse, Order } from './types';

function apiError(message: string, status?: number) {
  const err = new Error(message) as Error & {
    response?: { status: number; data?: unknown };
  };
  if (status != null) err.response = { status, data: { message } };
  return err;
}

export async function getOrders(): Promise<Order[]> {
  const { data, status } = await api.get<ApiResponse<Order[] | null>>('/orders');
  if (!data.success || data.data == null) {
    throw apiError(data.message || 'Failed to load orders', status >= 400 ? status : 500);
  }
  return data.data;
}

export async function getOrderByNumber(orderNumber: string): Promise<Order> {
  const { data, status } = await api.get<ApiResponse<Order | null>>(`/orders/${orderNumber}`);
  if (status === 404 || !data.success || data.data == null) {
    throw apiError(data.message || 'Order not found', 404);
  }
  return data.data;
}

export interface CreateOrderPayload {
  items: { productId: string; quantity: number; variant?: string }[];
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
    type: string;
  };
  paymentMethod: string;
  couponCode?: string;
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const { data, status } = await api.post<ApiResponse<Order>>('/orders', payload);
  if (!data.success || !data.data) {
    throw apiError(data.message || 'Failed to create order', status >= 400 ? status : 500);
  }
  return data.data;
}

export interface RefundOption {
  destination: 'WALLET' | 'SOURCE';
  available: boolean;
  label: string;
  description: string;
  timeline: string;
}

export interface RefundOptions {
  orderNumber: string;
  refundAmount: number;
  paymentMethod: string | null;
  options: RefundOption[];
}

export async function getRefundOptions(orderNumber: string): Promise<RefundOptions> {
  const { data, status } = await api.get<ApiResponse<RefundOptions>>(`/orders/${orderNumber}/refund-options`);
  if (!data.success || !data.data) {
    throw apiError(data.message || 'Failed to get refund options', status >= 400 ? status : 500);
  }
  return data.data;
}

export async function cancelOrder(
  orderNumber: string, 
  reason?: string,
  refundTo: 'WALLET' | 'SOURCE' = 'WALLET',
): Promise<Order & { refundProcessed?: boolean; refundMessage?: string }> {
  const { data, status } = await api.post<ApiResponse<Order & { refundProcessed?: boolean; refundMessage?: string }>>(
    `/orders/${orderNumber}/cancel`, 
    { reason, refundTo },
  );
  if (!data.success || !data.data) {
    throw apiError(data.message || 'Failed to cancel order', status >= 400 ? status : 500);
  }
  return data.data;
}

export function getInvoiceUrl(orderNumber: string): string {
  const base = api.defaults.baseURL || '';
  return `${base}/orders/${orderNumber}/invoice`;
}

export async function downloadInvoice(orderNumber: string): Promise<Blob> {
  const { data } = await api.get(`/orders/${orderNumber}/invoice`, {
    responseType: 'blob',
  });
  return data;
}
