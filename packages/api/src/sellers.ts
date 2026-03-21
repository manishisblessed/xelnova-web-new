import { api } from './client';
import type { ApiResponse, SellerProfile, Product } from './types';

export async function getSeller(id: string): Promise<SellerProfile> {
  const { data } = await api.get<ApiResponse<SellerProfile>>(`/sellers/${id}`);
  return data.data;
}

export async function getSellerProducts(id: string): Promise<{ seller: SellerProfile; products: Product[] }> {
  const { data } = await api.get<ApiResponse<{ seller: SellerProfile; products: Product[] }>>(`/sellers/${id}/products`);
  return data.data;
}
