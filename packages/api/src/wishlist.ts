import { api } from './client';
import type { ApiResponse, Product } from './types';

export async function getWishlist() {
  const { data } = await api.get<ApiResponse<Product[]>>('/wishlist');
  return data.data;
}

export async function getWishlistIds(): Promise<string[]> {
  const { data } = await api.get<ApiResponse<string[]>>('/wishlist/ids');
  return data.data;
}

export async function toggleWishlist(productId: string) {
  const { data } = await api.post<ApiResponse<{ added: boolean; productId: string }>>(`/wishlist/${productId}/toggle`);
  return data.data;
}

export async function addToWishlist(productId: string) {
  const { data } = await api.post<ApiResponse<{ added: boolean; productId: string }>>(`/wishlist/${productId}`);
  return data.data;
}

export async function removeFromWishlist(productId: string) {
  const { data } = await api.delete<ApiResponse<{ removed: boolean; productId: string }>>(`/wishlist/${productId}`);
  return data.data;
}
