import { api } from './client';
import type { ApiResponse, Cart } from './types';

export interface ShippingConfig {
  freeShippingMin: number;
  defaultRate: number;
  expressRate: number;
  codEnabled: boolean;
  codFee: number;
}

export async function getShippingConfig(): Promise<ShippingConfig> {
  try {
    const { data } = await api.get<ApiResponse<ShippingConfig>>('/cart/shipping-config');
    return data.data;
  } catch {
    return { freeShippingMin: 499, defaultRate: 49, expressRate: 99, codEnabled: true, codFee: 0 };
  }
}

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
