import { api } from './client';
import type { ApiResponse, Cart } from './types';

export async function getCart(): Promise<Cart> {
  const { data } = await api.get<ApiResponse<Cart>>('/cart');
  return data.data;
}

export async function addToCart(productId: string, quantity: number, variant?: string): Promise<Cart> {
  const { data } = await api.post<ApiResponse<Cart>>('/cart/add', { productId, quantity, variant });
  return data.data;
}

export async function updateCartItem(productId: string, quantity: number): Promise<Cart> {
  const { data } = await api.put<ApiResponse<Cart>>('/cart/update', { productId, quantity });
  return data.data;
}

export async function removeFromCart(productId: string): Promise<Cart> {
  const { data } = await api.delete<ApiResponse<Cart>>(`/cart/remove/${productId}`);
  return data.data;
}

export async function applyCoupon(code: string): Promise<Cart> {
  const { data } = await api.post<ApiResponse<Cart>>('/cart/coupon/apply', { code });
  return data.data;
}
