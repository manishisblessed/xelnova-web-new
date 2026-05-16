'use client';

import { useState, useEffect, useCallback } from 'react';
import { productsApi, categoriesApi, searchApi } from '@xelnova/api';
import type { Product as ApiProduct, Category as ApiCategory } from '@xelnova/api';

type MarketplacePolicy = Awaited<ReturnType<typeof productsApi.getMarketplacePolicy>>;
import type { Product, ProductReview } from './data/products';
import type { Category } from './data/categories';
import { FALLBACK_CATEGORIES } from './data/fallback-categories';
import { calculateDiscount, priceInclusiveOfGst } from '@xelnova/utils';

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

function normalizeSpecificationsApi(raw: unknown): Record<string, string> {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const out: Record<string, string> = {};
    for (const row of raw) {
      if (row && typeof row === 'object') {
        const o = row as Record<string, unknown>;
        const k = String(o.key ?? '').trim();
        const v = String(o.value ?? '').trim();
        if (k && v) out[k] = v;
      }
    }
    return out;
  }
  if (typeof raw === 'object') {
    return raw as Record<string, string>;
  }
  return {};
}

// ─── Product mapper: API → Frontend ───

export function mapProduct(p: ApiProduct): Product {
  const comparePrice = p.compareAtPrice ?? p.price;
  const gstRate = p.gstRate ?? null;
  const priceIncl = priceInclusiveOfGst(p.price, gstRate);
  const compareIncl = priceInclusiveOfGst(comparePrice, gstRate);
  const discount = calculateDiscount(priceIncl, compareIncl);

  return {
    id: p.id,
    slug: p.slug,
    xelnovaProductId: p.xelnovaProductId ?? null,
    name: p.name,
    description: p.description || p.shortDescription || '',
    price: p.price,
    comparePrice,
    gstRate,
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
      rating: typeof (p.seller as any)?.rating === 'number' ? (p.seller as any).rating : 0,
      slug: (p.seller as any)?.slug || undefined,
    },
    variants: normalizeVariants(p.variants),
    specifications: normalizeSpecificationsApi(p.specifications),
    productLengthCm: p.productLengthCm ?? null,
    productWidthCm: p.productWidthCm ?? null,
    productHeightCm: p.productHeightCm ?? null,
    productWeightKg: p.productWeightKg ?? null,
    reviews: [],
    tags: p.tags || [],
    createdAt: p.createdAt,
    isFeatured: p.isFeatured,
    isFlashDeal: p.isFlashDeal,
    flashDealEndsAt: p.flashDealEndsAt ?? undefined,
    // Amazon-style product information
    featuresAndSpecs: (p.featuresAndSpecs && typeof p.featuresAndSpecs === 'object') ? p.featuresAndSpecs as Record<string, string> : undefined,
    materialsAndCare: (p.materialsAndCare && typeof p.materialsAndCare === 'object') ? p.materialsAndCare as Record<string, string> : undefined,
    itemDetails: (p.itemDetails && typeof p.itemDetails === 'object') ? p.itemDetails as Record<string, string> : undefined,
    additionalDetails: (p.additionalDetails && typeof p.additionalDetails === 'object') ? p.additionalDetails as Record<string, string> : undefined,
    productDescription: p.productDescription ?? undefined,
    safetyInfo: p.safetyInfo ?? undefined,
    regulatoryInfo: p.regulatoryInfo ?? undefined,
    warrantyInfo: p.warrantyInfo ?? undefined,
    deliveredBy: p.deliveredBy ?? 'Xelnova',
    isReplaceable: p.isReplaceable ?? false,
    isReturnable: p.isReturnable !== false,
    isCancellable: p.isCancellable !== false,
    returnWindow: p.returnWindow ?? 7,
    replacementWindow: p.replacementWindow ?? null,
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFetcher = useCallback(fetcher, [depsKey]);

  useEffect(() => {
    const controller = new AbortController();
    setState(s => ({ ...s, loading: true, error: null }));
    stableFetcher()
      .then(data => { if (!controller.signal.aborted) setState({ data, loading: false, error: null }); })
      .catch(err => { if (!controller.signal.aborted) setState({ data: null, loading: false, error: err?.response?.data?.message || err.message || 'Failed to load' }); });
    return () => { controller.abort(); };
  }, [stableFetcher, trigger]);

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

export interface AvailableCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  validUntil: string | null;
}

export function useProductBySlug(slug: string) {
  return useFetch(async () => {
    const p = await productsApi.getProductBySlug(slug);
    const product = mapProduct(p);
    const relatedProducts = (p.relatedProducts || []).map(mapProduct);
    const availableCoupons = (p.availableCoupons || []) as AvailableCoupon[];
    return { product, relatedProducts, availableCoupons };
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

/**
 * Marketplace policy hook — lead time, free-shipping threshold and return
 * policy used across the storefront. Cached for the session because the
 * values rarely change and a stale fallback is harmless.
 */
let _cachedPolicy: MarketplacePolicy | null = null;
let _policyPromise: Promise<MarketplacePolicy> | null = null;
export function useMarketplacePolicy() {
  return useFetch(async () => {
    if (_cachedPolicy) return _cachedPolicy;
    const policy = await deduplicatedFetch('marketplacePolicy', () => productsApi.getMarketplacePolicy());
    _cachedPolicy = policy;
    return policy;
  }, []);
}

/**
 * Lightweight hook for components that only need the marketplace
 * free-shipping threshold (e.g. product cards). Reads the module-level
 * cache synchronously on every render — once one consumer has triggered
 * the fetch, every other consumer mounts with the correct value already
 * in place.
 *
 * Convention:
 *   - `0`  → free shipping on every order (badge shows on every product)
 *   - `N`  → free shipping at or above ₹N (badge shows when price ≥ N)
 */
export function useFreeShippingMin(fallback = 0): number {
  const [value, setValue] = useState<number>(_cachedPolicy?.freeShippingMin ?? fallback);
  useEffect(() => {
    if (_cachedPolicy) {
      if (_cachedPolicy.freeShippingMin !== value) setValue(_cachedPolicy.freeShippingMin);
      return;
    }
    if (!_policyPromise) {
      _policyPromise = deduplicatedFetch('marketplacePolicy', () =>
        productsApi.getMarketplacePolicy(),
      ).then((p) => {
        _cachedPolicy = p;
        return p;
      });
    }
    let active = true;
    _policyPromise
      .then((p) => {
        if (active && p.freeShippingMin !== value) setValue(p.freeShippingMin);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

// ─── Category hooks ───

export function useCategories() {
  const state = useFetch(async () => {
    const cats = await deduplicatedFetch('categories', () => categoriesApi.getCategories());
    return cats.map(mapCategory);
  }, []);
  const data =
    state.data && state.data.length > 0 ? state.data : FALLBACK_CATEGORIES;
  return { ...state, data };
}

// ─── Search hooks ───

export function useSearch(query: string, page?: number, filters?: Record<string, any>) {
  const filterKey = filters ? JSON.stringify(filters) : '';
  return useFetch(async () => {
    if (!query && !filters?.category) return { products: [], meta: undefined, filters: undefined };
    const result = await searchApi.searchProducts(query, page, undefined, filters as any);
    return {
      products: (result.products || []).map(mapProduct),
      meta: result.meta,
      filters: result.filters,
    };
  }, [query, page, filterKey]);
}
