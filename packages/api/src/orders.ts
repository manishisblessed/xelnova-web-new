import { api } from './client';
import type { ApiResponse, Order } from './types';

export async function getOrders(): Promise<Order[]> {
  const { data } = await api.get<ApiResponse<Order[]>>('/orders');
  return data.data;
}

export async function getOrderByNumber(orderNumber: string): Promise<Order> {
  const { data } = await api.get<ApiResponse<Order>>(`/orders/${orderNumber}`);
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
  const { data } = await api.post<ApiResponse<Order>>('/orders', payload);
  return data.data;
}
