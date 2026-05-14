"use client";

import { Suspense, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X, Star, ChevronDown } from "lucide-react";
import { useSearch } from "@/lib/api";
import { ProductCard } from "@/components/marketplace/product-card";

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" },
  { value: "newest", label: "Newest First" },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const brand = searchParams.get("brand") || "";
  const sortBy = searchParams.get("sortBy") || "relevance";
  const minRating = searchParams.get("minRating") || "";

  const [showFilters, setShowFilters] = useState(false);

  const filters = useMemo(() => ({
    category: category || undefined,
    brand: brand || undefined,
    minRating: minRating ? parseFloat(minRating) : undefined,
    sortBy: (sortBy as any) || undefined,
  }), [category, brand, minRating, sortBy]);

  const { data, loading } = useSearch(query, 1, filters);
  const results = data?.products || [];
  const availableFilters = data?.filters;

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/search?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    router.push(`/search?${params.toString()}`);
  };

  const hasActiveFilters = !!(category || brand || minRating);

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary font-display">
              {query ? <>Results for &quot;<span className="text-primary-600">{query}</span>&quot;</> : "Browse Products"}
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              {loading ? "Searching..." : `${results.length} ${results.length === 1 ? "result" : "results"} found`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-2 text-sm text-text-secondary hover:bg-surface-muted transition-colors lg:hidden"
            >
              <SlidersHorizontal size={16} /> Filters
            </button>
            <select
              value={sortBy}
              onChange={(e) => updateParam("sortBy", e.target.value)}
              className="rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Filters sidebar */}
          <aside className={`${showFilters ? "block" : "hidden"} lg:block w-full lg:w-64 shrink-0`}>
            <div className="sticky top-24 space-y-6 rounded-2xl border border-border bg-surface-raised p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-primary">Filters</h3>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-primary-600 hover:text-primary-700">
                    Clear all
                  </button>
                )}
              </div>

              {availableFilters?.categories && availableFilters.categories.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Category</h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {availableFilters.categories.map((cat: any) => (
                      <button
                        key={cat.slug}
                        onClick={() => updateParam("category", category === cat.slug ? "" : cat.slug)}
                        className={`block w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
                          category === cat.slug
                            ? "bg-primary-50 text-primary-700 font-medium"
                            : "text-text-secondary hover:bg-surface-muted"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {availableFilters?.brands && availableFilters.brands.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Brand</h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {availableFilters.brands.map((b: string) => (
                      <button
                        key={b}
                        onClick={() => updateParam("brand", brand === b ? "" : b)}
                        className={`block w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
                          brand === b
                            ? "bg-primary-50 text-primary-700 font-medium"
                            : "text-text-secondary hover:bg-surface-muted"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Rating</h4>
                <div className="space-y-1.5">
                  {[4, 3, 2].map((r) => (
                    <button
                      key={r}
                      onClick={() => updateParam("minRating", minRating === String(r) ? "" : String(r))}
                      className={`flex items-center gap-1.5 w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
                        minRating === String(r)
                          ? "bg-primary-50 text-primary-700 font-medium"
                          : "text-text-secondary hover:bg-surface-muted"
                      }`}
                    >
                      {Array.from({ length: r }).map((_, i) => (
                        <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                      ))}
                      <span>& up</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mb-4">
                {category && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                    {category} <button onClick={() => updateParam("category", "")}><X size={12} /></button>
                  </span>
                )}
                {brand && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                    {brand} <button onClick={() => updateParam("brand", "")}><X size={12} /></button>
                  </span>
                )}
                {minRating && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                    {minRating}+ stars <button onClick={() => updateParam("minRating", "")}><X size={12} /></button>
                  </span>
                )}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
              </div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-5">
                {results.map((product: any, i: number) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))}
              </div>
            ) : query || hasActiveFilters ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="rounded-full bg-surface-muted p-6 mb-4 border border-border">
                  <Search size={36} className="text-text-muted" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">No results found</h3>
                <p className="mt-1 text-sm text-text-muted max-w-md">
                  Try different keywords or adjust your filters.
                </p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="mt-4 rounded-xl bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 transition-colors">
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="rounded-full bg-surface-muted p-6 mb-4 border border-border">
                  <Search size={36} className="text-text-muted" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">Start searching</h3>
                <p className="mt-1 text-sm text-text-muted">
                  Type a product name, brand, or category to find what you need.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-surface"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
