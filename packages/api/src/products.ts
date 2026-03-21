import { api } from './client';
import type { ApiResponse, Product, Banner } from './types';

export interface ProductQuery {
  page?: number;
  limit?: number;
  category?: string;
  subcategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  search?: string;
  tag?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
}

export async function getProducts(query?: ProductQuery) {
  const { data } = await api.get<ApiResponse<Product[]>>('/products', { params: query });
  return { products: data.data, meta: data.meta };
}

export async function getProductBySlug(slug: string) {
  const { data } = await api.get<ApiResponse<Product & { relatedProducts: Product[] }>>(`/products/${slug}`);
  return data.data;
}

export async function getFeaturedProducts() {
  const { data } = await api.get<ApiResponse<Product[]>>('/products/featured');
  return data.data;
}

export async function getTrendingProducts() {
  const { data } = await api.get<ApiResponse<Product[]>>('/products/trending');
  return data.data;
}

export async function getFlashDeals() {
  const { data } = await api.get<ApiResponse<Product[]>>('/products/flash-deals');
  return data.data;
}

export async function getBanners() {
  const { data } = await api.get<ApiResponse<Banner[]>>('/products/banners');
  return data.data;
}
