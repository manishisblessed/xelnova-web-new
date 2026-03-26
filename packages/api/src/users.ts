import { api } from './client';
import type { ApiResponse, AuthUser, Address, Product } from './types';

export async function getProfile(): Promise<AuthUser> {
  const { data, status } = await api.get<ApiResponse<AuthUser | null>>('/users/profile');
  if (!data.success || data.data == null) {
    const err = new Error(data.message || 'Failed to load profile') as Error & {
      response?: { status: number; data?: unknown };
    };
    err.response = { status: status >= 400 ? status : 500, data };
    throw err;
  }
  return data.data;
}

export async function updateProfile(body: { name?: string; email?: string; phone?: string }): Promise<AuthUser> {
  const { data, status } = await api.put<ApiResponse<AuthUser | null>>('/users/profile', body);
  if (!data.success || data.data == null) {
    const err = new Error(data.message || 'Failed to update profile') as Error & {
      response?: { status: number; data?: unknown };
    };
    err.response = { status: status >= 400 ? status : 500, data };
    throw err;
  }
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
