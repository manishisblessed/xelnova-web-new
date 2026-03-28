import { api } from './client';
import type { ApiResponse } from './types';

interface PaymentOrder {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  orderId: string;
  keyId: string;
}

export async function createPaymentOrder(orderId: string): Promise<PaymentOrder> {
  const { data } = await api.post<ApiResponse<PaymentOrder>>(`/payment/create-order/${orderId}`);
  if (!data.success || !data.data) throw new Error(data.message || 'Failed to create payment order');
  return data.data;
}

export async function verifyPayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ verified: boolean; orderId: string }> {
  const { data } = await api.post<ApiResponse<{ verified: boolean; orderId: string }>>('/payment/verify', payload);
  if (!data.success || !data.data) throw new Error(data.message || 'Payment verification failed');
  return data.data;
}
