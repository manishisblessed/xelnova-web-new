import { api } from './client';
import type { ApiResponse, AuthUser, Address, Product } from './types';

export async function getProfile(): Promise<AuthUser> {
  const { data } = await api.get<ApiResponse<AuthUser>>('/users/profile');
  return data.data;
}

export async function updateProfile(body: { name?: string; email?: string; phone?: string }): Promise<AuthUser> {
  const { data } = await api.put<ApiResponse<AuthUser>>('/users/profile', body);
  return data.data;
}

export async function getAddresses(): Promise<Address[]> {
  const { data } = await api.get<ApiResponse<Address[]>>('/users/addresses');
  return data.data;
}

export async function addAddress(address: Omit<Address, 'id' | 'isDefault'>): Promise<Address> {
  const { data } = await api.post<ApiResponse<Address>>('/users/addresses', address);
  return data.data;
}

export async function getWishlist(): Promise<Product[]> {
  const { data } = await api.get<ApiResponse<Product[]>>('/users/wishlist');
  return data.data;
}

export async function toggleWishlist(productId: string): Promise<{ added: boolean; wishlist: string[] }> {
  const { data } = await api.post<ApiResponse<{ added: boolean; wishlist: string[] }>>('/users/wishlist/toggle', { productId });
  return data.data;
}
