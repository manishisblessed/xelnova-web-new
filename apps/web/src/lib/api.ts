'use client';

import { useState, useEffect, useCallback } from 'react';
import { productsApi, categoriesApi, searchApi } from '@xelnova/api';
import type { Product as ApiProduct, Category as ApiCategory } from '@xelnova/api';
import type { Product, ProductReview } from './data/products';
import type { Category } from './data/categories';

// ─── Product mapper: API → Frontend ───

export function mapProduct(p: ApiProduct): Product {
  const comparePrice = p.compareAtPrice ?? p.price;
  const discount = comparePrice > p.price
    ? Math.round(((comparePrice - p.price) / comparePrice) * 100)
    : 0;

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description || '',
    price: p.price,
    comparePrice,
    discount,
    images: p.images?.length ? p.images : [],
    category: (p.category as any)?.slug || p.categoryId || '',
    brand: p.brand || '',
    rating: p.rating,
    reviewCount: p.reviewCount,
    boughtLastMonth: 0,
    inStock: p.stock > 0,
    stockCount: p.stock,
    seller: {
      name: (p.seller as any)?.storeName || 'Xelnova Seller',
      rating: (p.seller as any)?.rating || 4.5,
    },
    variants: Array.isArray(p.variants) ? p.variants : [],
    specifications: (p.specifications && typeof p.specifications === 'object') ? p.specifications as Record<string, string> : {},
    reviews: [],
    tags: p.tags || [],
    createdAt: p.createdAt,
    isFeatured: p.isFeatured,
    isFlashDeal: p.isFlashDeal,
    flashDealEndsAt: p.flashDealEndsAt ?? undefined,
  };
}

export function mapCategory(c: ApiCategory): Category {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: c.image || '',
    description: c.description || '',
    productCount: c.productCount ?? 0,
    featured: true,
  };
}

// ─── Generic fetch hook ───

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useFetch<T>(fetcher: () => Promise<T>, deps: any[] = []): FetchState<T> & { refetch: () => void } {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null });
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => setTrigger(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: null }));
    fetcher()
      .then(data => { if (!cancelled) setState({ data, loading: false, error: null }); })
      .catch(err => { if (!cancelled) setState({ data: null, loading: false, error: err?.response?.data?.message || err.message || 'Failed to load' }); });
    return () => { cancelled = true; };
  }, [...deps, trigger]);

  return { ...state, refetch };
}

// ─── Product hooks ───

export function useProducts(params?: {
  page?: number;
  limit?: number;
  category?: string;
  brand?: string;
  search?: string;
  sortBy?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
}) {
  return useFetch(async () => {
    const result = await productsApi.getProducts(params as any);
    return {
      products: (result.products || []).map(mapProduct),
      meta: result.meta,
    };
  }, [JSON.stringify(params)]);
}

export function useProductBySlug(slug: string) {
  return useFetch(async () => {
    const p = await productsApi.getProductBySlug(slug);
    const product = mapProduct(p);
    const relatedProducts = (p.relatedProducts || []).map(mapProduct);
    return { product, relatedProducts };
  }, [slug]);
}

export function useFeaturedProducts() {
  return useFetch(async () => {
    const products = await productsApi.getFeaturedProducts();
    return products.map(mapProduct);
  }, []);
}

export function useFlashDeals() {
  return useFetch(async () => {
    const products = await productsApi.getFlashDeals();
    return products.map(mapProduct);
  }, []);
}

// ─── Category hooks ───

export function useCategories() {
  return useFetch(async () => {
    const cats = await categoriesApi.getCategories();
    return cats.map(mapCategory);
  }, []);
}

// ─── Search hooks ───

export function useSearch(query: string, page?: number) {
  return useFetch(async () => {
    if (!query) return { products: [], meta: undefined };
    const result = await searchApi.searchProducts(query, page);
    return {
      products: (result.products || []).map(mapProduct),
      meta: result.meta,
    };
  }, [query, page]);
}
