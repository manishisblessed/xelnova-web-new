import { api } from './client';
import type { ApiResponse, AuthUser, Address, Product } from './types';
import { isAxiosError } from 'axios';

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

export async function changePassword(body: {
  newPassword: string;
  currentPassword?: string;
}): Promise<void> {
  try {
    const { data } = await api.patch<ApiResponse<unknown>>('/users/password', body);
    if (!data.success) {
      throw new Error(data.message || 'Failed to update password');
    }
  } catch (e: unknown) {
    if (isAxiosError(e)) {
      const raw = (e.response?.data as { message?: string | string[] } | undefined)?.message;
      const msg = Array.isArray(raw) ? raw.join('. ') : raw;
      throw new Error(msg || e.message || 'Failed to update password');
    }
    throw e;
  }
}

export async function getAddresses(): Promise<Address[]> {
  const { data } = await api.get<ApiResponse<Address[]>>('/users/addresses');
  return data.data;
}

export async function addAddress(address: Omit<Address, 'id' | 'isDefault'>): Promise<Address> {
  const { data } = await api.post<ApiResponse<Address>>('/users/addresses', address);
  return data.data;
}

export async function updateAddress(addressId: string, address: Partial<Omit<Address, 'id'>>): Promise<Address> {
  const { data } = await api.patch<ApiResponse<Address>>(`/users/addresses/${addressId}`, address);
  return data.data;
}

export async function deleteAddress(addressId: string): Promise<void> {
  await api.delete(`/users/addresses/${addressId}`);
}

export async function setDefaultAddress(addressId: string): Promise<Address> {
  const { data } = await api.patch<ApiResponse<Address>>(`/users/addresses/${addressId}`, { isDefault: true });
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
