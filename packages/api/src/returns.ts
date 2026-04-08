import { api } from './client';
import type { ApiResponse } from './types';

export interface ReturnRequest {
  id: string;
  orderId: string;
  userId: string;
  reason: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PICKED_UP' | 'REFUNDED';
  adminNote: string | null;
  refundAmount: number | null;
  createdAt: string;
  updatedAt: string;
  order: {
    orderNumber: string;
    total: number;
    status: string;
    items?: {
      productName: string;
      productImage: string | null;
      quantity: number;
      price: number;
      product?: { name: string; images: string[] };
    }[];
  };
}

export async function createReturn(orderNumber: string, reason: string): Promise<ReturnRequest> {
  const { data } = await api.post<ApiResponse<ReturnRequest>>('/returns', { orderNumber, reason });
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Failed to submit return request');
  }
  return data.data;
}

export async function getReturns(): Promise<ReturnRequest[]> {
  const { data } = await api.get<ApiResponse<ReturnRequest[]>>('/returns');
  if (!data.success || !data.data) {
    throw new Error(data.message || 'Failed to load returns');
  }
  return data.data;
}
