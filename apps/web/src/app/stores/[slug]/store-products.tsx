'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, SlidersHorizontal, X, Loader2 } from 'lucide-react';
import { storesApi } from '@xelnova/api';
import { cn } from '@xelnova/utils';
import { StoreProductCardEnhanced } from './store-product-card-enhanced';
import { mapProduct } from '@/lib/api';
import type { Product } from '@/lib/data/products';

interface StoreProductsProps {
  slug: string;
  initialCategory?: string;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Best Rating' },
  { value: 'bestselling', label: 'Best Selling' },
] as const;

export function StoreProducts({ slug, initialCategory }: StoreProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const [sort, setSort] = useState<'price_asc' | 'price_desc' | 'newest' | 'rating' | 'bestselling'>('newest');
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);

  const fetchProducts = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 1 : page;
      const result = await storesApi.getStoreProducts(slug, {
        page: currentPage,
        limit: 20,
        sort,
        category,
        search: search || undefined,
        inStock: inStockOnly || undefined,
      });

      const mappedProducts = result.items.map((p: any) => mapProduct(p));

      if (reset) {
        setProducts(mappedProducts);
      } else {
        setProducts(prev => [...prev, ...mappedProducts]);
      }

      setTotal(result.total);
      setHasMore(result.hasNext);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [slug, page, sort, category, search, inStockOnly]);

  useEffect(() => {
    fetchProducts(true);
  }, [sort, category, search, inStockOnly, slug]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setPage(p => p + 1);
    }
  };

  useEffect(() => {
    if (page > 1) {
      fetchProducts(false);
    }
  }, [page]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">All Products</h2>
          <p className="mt-1 text-sm text-text-muted">
            {loading ? 'Loading...' : `Showing ${products.length} of ${total} products`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search in store..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 sm:w-64 rounded-xl border border-border bg-surface-muted px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary-400"
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="appearance-none rounded-xl border border-border bg-surface-muted px-4 py-2.5 pr-10 text-sm font-medium text-text-primary outline-none focus:border-primary-400"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort: {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
          </div>

          {/* In Stock Filter */}
          <button
            onClick={() => setInStockOnly(!inStockOnly)}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
              inStockOnly
                ? 'border-primary-400 bg-primary-50 text-primary-600'
                : 'border-border bg-surface-muted text-text-primary hover:border-primary-300'
            )}
          >
            In Stock
            {inStockOnly && <X size={14} />}
          </button>
        </div>
      </div>

      {/* Active Filters */}
      {(category || inStockOnly || search) && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {category && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600">
              {category}
              <button onClick={() => setCategory(undefined)} className="hover:text-primary-600">
                <X size={12} />
              </button>
            </span>
          )}
          {search && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600">
              &quot;{search}&quot;
              <button onClick={() => setSearch('')} className="hover:text-primary-600">
                <X size={12} />
              </button>
            </span>
          )}
          {inStockOnly && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600">
              In Stock Only
              <button onClick={() => setInStockOnly(false)} className="hover:text-primary-600">
                <X size={12} />
              </button>
            </span>
          )}
          <button
            onClick={() => {
              setCategory(undefined);
              setSearch('');
              setInStockOnly(false);
            }}
            className="text-sm font-medium text-primary-600 hover:text-primary-600"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-400 border-t-transparent" />
        </div>
      ) : products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product, i) => (
              <StoreProductCardEnhanced key={product.id} product={product} index={i} />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 rounded-xl bg-surface-muted px-8 py-3 text-sm font-semibold text-text-primary hover:bg-surface-muted disabled:opacity-50 transition-colors"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More Products'
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full bg-surface-muted p-6">
            <SlidersHorizontal size={32} className="text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">No products found</h3>
          <p className="mt-1 text-sm text-text-muted">
            Try adjusting your filters or search terms.
          </p>
          <button
            onClick={() => {
              setCategory(undefined);
              setSearch('');
              setInStockOnly(false);
            }}
            className="mt-4 rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-400"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}
