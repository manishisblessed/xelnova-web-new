import { api } from './client';
import type { ApiResponse, Product } from './types';

export interface SearchFilters {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest';
}

export interface SearchAvailableFilters {
  categories: { id: string; name: string; slug: string }[];
  brands: string[];
  priceRange: { min: number; max: number };
}

export async function searchProducts(q: string, page?: number, limit?: number, filters?: SearchFilters) {
  const { data } = await api.get<ApiResponse<Product[]> & { filters?: SearchAvailableFilters }>('/search', {
    params: { q, page, limit, ...filters },
  });
  return { products: data.data, meta: data.meta, filters: data.filters };
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
