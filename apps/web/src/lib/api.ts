'use client';

import { useState, useEffect, useCallback } from 'react';
import { productsApi, categoriesApi, searchApi } from '@xelnova/api';
import type { Product as ApiProduct, Category as ApiCategory } from '@xelnova/api';
import type { Product, ProductReview } from './data/products';
import type { Category } from './data/categories';

// ─── In-flight request deduplication cache ───

const requestCache = new Map<string, { promise: Promise<any>; ts: number }>();
const CACHE_TTL = 30_000;

function deduplicatedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = requestCache.get(key);
  if (cached && now - cached.ts < CACHE_TTL) return cached.promise as Promise<T>;
  const promise = fetcher().catch((err) => {
    requestCache.delete(key);
    throw err;
  });
  requestCache.set(key, { promise, ts: now });
  return promise;
}

// ─── Variant normalizer: handle old image/bigImage → images[] migration ───

function normalizeVariants(raw: unknown): Product['variants'] {
  if (!Array.isArray(raw)) return [];
  return raw.map((v: any) => {
    if (!v || typeof v !== 'object') return v;
    const options = Array.isArray(v.options)
      ? v.options.map((o: any) => {
          if (!o || typeof o !== 'object') return o;
          if (Array.isArray(o.images) && o.images.length > 0) return o;
          const imgs: string[] = [];
          if (o.bigImage && typeof o.bigImage === 'string') imgs.push(o.bigImage);
          if (o.image && typeof o.image === 'string' && !imgs.includes(o.image)) imgs.push(o.image);
          if (imgs.length > 0) return { ...o, images: imgs };
          return o;
        })
      : v.options;
    return { ...v, options };
  });
}

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
    description: p.description || p.shortDescription || '',
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
    variants: normalizeVariants(p.variants),
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
  const depsKey = JSON.stringify(deps);

  const refetch = useCallback(() => setTrigger(t => t + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState(s => ({ ...s, loading: true, error: null }));
    fetcher()
      .then(data => { if (!controller.signal.aborted) setState({ data, loading: false, error: null }); })
      .catch(err => { if (!controller.signal.aborted) setState({ data: null, loading: false, error: err?.response?.data?.message || err.message || 'Failed to load' }); });
    return () => { controller.abort(); };
  }, [depsKey, trigger]);

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
    const products = await deduplicatedFetch('featured', () => productsApi.getFeaturedProducts());
    return products.map(mapProduct);
  }, []);
}

export function useFlashDeals() {
  return useFetch(async () => {
    const products = await deduplicatedFetch('flashDeals', () => productsApi.getFlashDeals());
    return products.map(mapProduct);
  }, []);
}

// ─── Category hooks ───

export function useCategories() {
  return useFetch(async () => {
    const cats = await deduplicatedFetch('categories', () => categoriesApi.getCategories());
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
