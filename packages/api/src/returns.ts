import { api } from './client';
import type { ApiResponse } from './types';

export interface ReturnRequest {
  id: string;
  orderId: string;
  userId: string;
  kind?: 'RETURN' | 'REPLACEMENT';
  reasonCode?: string | null;
  reason: string;
  description?: string | null;
  imageUrls?: string[];
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

export type CreateReturnBody = {
  kind?: 'RETURN' | 'REPLACEMENT';
  reasonCode?: string;
  reason?: string;
  description?: string;
  imageUrls?: string[];
};

export async function createReturn(
  orderNumber: string,
  body: string | CreateReturnBody,
): Promise<ReturnRequest> {
  const payload =
    typeof body === 'string'
      ? { orderNumber, reasonCode: 'OTHER', reason: body }
      : { orderNumber, ...body, reasonCode: body.reasonCode || 'OTHER' };
  const { data } = await api.post<ApiResponse<ReturnRequest>>('/returns', payload);
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
