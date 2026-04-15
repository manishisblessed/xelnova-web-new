import { api } from './client';
import type { ApiResponse, SellerStore, Product, SellerStoreCategory, SellerStoreBanner, SellerStoreSettings } from './types';

export interface StoreProductsParams {
  category?: string;
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'rating' | 'bestselling';
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export interface StoreProductsResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Public endpoints (for buyers)

export async function getStore(slug: string): Promise<SellerStore> {
  const res = await api.get<ApiResponse<SellerStore>>(`/stores/${slug}`);
  return res.data.data;
}

export async function getStoreProducts(
  slug: string,
  params?: StoreProductsParams,
): Promise<StoreProductsResponse> {
  const res = await api.get<ApiResponse<Product[]> & { meta: StoreProductsResponse }>(
    `/stores/${slug}/products`,
    { params },
  );
  return {
    items: res.data.data,
    total: res.data.meta?.total ?? 0,
    page: res.data.meta?.page ?? 1,
    limit: res.data.meta?.limit ?? 20,
    totalPages: res.data.meta?.totalPages ?? 1,
    hasNext: res.data.meta?.hasNext ?? false,
    hasPrev: res.data.meta?.hasPrev ?? false,
  };
}

export async function getStoreCategories(slug: string): Promise<SellerStoreCategory[]> {
  const res = await api.get<ApiResponse<SellerStoreCategory[]>>(`/stores/${slug}/categories`);
  return res.data.data;
}

export async function getStoreDeals(slug: string, limit?: number): Promise<Product[]> {
  const res = await api.get<ApiResponse<Product[]>>(`/stores/${slug}/deals`, {
    params: limit ? { limit } : undefined,
  });
  return res.data.data;
}

export async function getStoreBestsellers(slug: string, limit?: number): Promise<Product[]> {
  const res = await api.get<ApiResponse<Product[]>>(`/stores/${slug}/bestsellers`, {
    params: limit ? { limit } : undefined,
  });
  return res.data.data;
}

// Authenticated endpoints (for seller dashboard)

export async function getOwnStoreSettings(): Promise<SellerStoreSettings> {
  const res = await api.get<ApiResponse<SellerStoreSettings>>('/seller/store');
  return res.data.data;
}

export async function updateStoreSettings(data: {
  heroBannerUrl?: string;
  heroBannerMobile?: string;
  aboutTitle?: string;
  aboutDescription?: string;
  storeThemeColor?: string;
}): Promise<void> {
  await api.patch('/seller/store', data);
}

export async function updateFeaturedProducts(productIds: string[]): Promise<void> {
  await api.put('/seller/store/featured-products', { productIds });
}

export async function createStoreBanner(data: {
  title?: string;
  imageUrl: string;
  mobileUrl?: string;
  link?: string;
  sortOrder?: number;
}): Promise<SellerStoreBanner> {
  const res = await api.post<ApiResponse<SellerStoreBanner>>('/seller/store/banners', data);
  return res.data.data;
}

export async function updateStoreBanner(
  id: string,
  data: {
    title?: string;
    imageUrl?: string;
    mobileUrl?: string;
    link?: string;
    sortOrder?: number;
    isActive?: boolean;
  },
): Promise<SellerStoreBanner> {
  const res = await api.patch<ApiResponse<SellerStoreBanner>>(`/seller/store/banners/${id}`, data);
  return res.data.data;
}

export async function deleteStoreBanner(id: string): Promise<void> {
  await api.delete(`/seller/store/banners/${id}`);
}

export async function reorderStoreBanners(bannerIds: string[]): Promise<SellerStoreBanner[]> {
  const res = await api.put<ApiResponse<SellerStoreBanner[]>>('/seller/store/banners/reorder', {
    bannerIds,
  });
  return res.data.data;
}
