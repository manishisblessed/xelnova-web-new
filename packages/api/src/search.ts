import { api } from './client';
import type { ApiResponse, Product } from './types';

export async function searchProducts(q: string, page?: number, limit?: number) {
  const { data } = await api.get<ApiResponse<Product[]>>('/search', { params: { q, page, limit } });
  return { products: data.data, meta: data.meta };
}

export async function getAutocomplete(q: string) {
  const { data } = await api.get<ApiResponse<{
    products: { type: 'product'; text: string; slug: string; image: string; price: number }[];
    categories: { type: 'category'; text: string; slug: string }[];
  }>>('/search/autocomplete', { params: { q } });
  return data.data;
}

export async function getPopularSearches(): Promise<string[]> {
  const { data } = await api.get<ApiResponse<string[]>>('/search/popular');
  return data.data;
}
