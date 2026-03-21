import { api } from './client';
import type { ApiResponse, Category, Product } from './types';

export async function getCategories(): Promise<Category[]> {
  const { data } = await api.get<ApiResponse<Category[]>>('/categories');
  return data.data;
}

export async function getCategoryBySlug(slug: string): Promise<{ category: Category; products: Product[] }> {
  const { data } = await api.get<ApiResponse<{ category: Category; products: Product[] }>>(`/categories/${slug}`);
  return data.data;
}
