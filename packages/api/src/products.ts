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

export interface MarketplaceStats {
  products: number;
  sellers: number;
  customers: number;
  orders: number;
}

export interface BrandItem {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  featured: boolean;
}

export interface TopReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  helpful: number;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null };
  product: { name: string; slug: string; images: string[] };
}

export async function getProducts(query?: ProductQuery) {
  const { data } = await api.get<ApiResponse<Product[]>>('/products', { params: query });
  return { products: data.data, meta: data.meta };
}

export async function getProductBySlug(slug: string) {
  const { data } = await api.get<ApiResponse<Product & { relatedProducts: Product[]; availableCoupons?: { id: string; code: string; description: string | null; discountType: 'PERCENTAGE' | 'FLAT'; discountValue: number; minOrderAmount: number; maxDiscount: number | null; validUntil: string | null }[] }>>(`/products/${slug}`);
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

export async function getBanners(position?: string) {
  const params = position ? { position } : {};
  const { data } = await api.get<ApiResponse<Banner[]>>('/products/banners', { params });
  return data.data;
}

export async function getStats(): Promise<MarketplaceStats> {
  const { data } = await api.get<ApiResponse<MarketplaceStats>>('/products/stats');
  return data.data;
}

export async function getBrands(): Promise<BrandItem[]> {
  const { data } = await api.get<ApiResponse<BrandItem[]>>('/products/brands');
  return data.data;
}

export async function getTopReviews(): Promise<TopReview[]> {
  const { data } = await api.get<ApiResponse<TopReview[]>>('/products/reviews/top');
  return data.data;
}

export interface MarketplacePolicy {
  defaultDeliveryDays: number;
  freeShippingMin: number;
  returnPolicy: {
    isCancellable: boolean;
    isReturnable: boolean;
    isReplaceable: boolean;
    returnWindow: number;
    cancellationWindow: number;
  };
}

export async function getMarketplacePolicy(): Promise<MarketplacePolicy> {
  const { data } = await api.get<ApiResponse<MarketplacePolicy>>('/products/marketplace-policy');
  return data.data;
}
