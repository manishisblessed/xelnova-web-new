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
    <div className="min-h-screen bg-surface-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white font-display">
              {query ? <>Results for &quot;<span className="text-gold-400">{query}</span>&quot;</> : "Browse Products"}
            </h1>
            <p className="mt-1 text-sm text-surface-100">
              {loading ? "Searching..." : `${results.length} ${results.length === 1 ? "result" : "results"} found`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-xl border border-surface-300/30 bg-surface-800 px-4 py-2 text-sm text-surface-100 hover:bg-surface-700 transition-colors lg:hidden"
            >
              <SlidersHorizontal size={16} /> Filters
            </button>
            <select
              value={sortBy}
              onChange={(e) => updateParam("sortBy", e.target.value)}
              className="rounded-xl border border-surface-300/30 bg-surface-800 px-3 py-2 text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-gold-400"
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
            <div className="sticky top-24 space-y-6 rounded-2xl border border-surface-300/20 bg-surface-900 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Filters</h3>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-gold-400 hover:text-gold-300">
                    Clear all
                  </button>
                )}
              </div>

              {availableFilters?.categories && availableFilters.categories.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-surface-200 uppercase tracking-wider mb-2">Category</h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {availableFilters.categories.map((cat: any) => (
                      <button
                        key={cat.slug}
                        onClick={() => updateParam("category", category === cat.slug ? "" : cat.slug)}
                        className={`block w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
                          category === cat.slug
                            ? "bg-gold-400/20 text-gold-300 font-medium"
                            : "text-surface-100 hover:bg-surface-800"
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
                  <h4 className="text-xs font-semibold text-surface-200 uppercase tracking-wider mb-2">Brand</h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {availableFilters.brands.map((b: string) => (
                      <button
                        key={b}
                        onClick={() => updateParam("brand", brand === b ? "" : b)}
                        className={`block w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
                          brand === b
                            ? "bg-gold-400/20 text-gold-300 font-medium"
                            : "text-surface-100 hover:bg-surface-800"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-surface-200 uppercase tracking-wider mb-2">Rating</h4>
                <div className="space-y-1.5">
                  {[4, 3, 2].map((r) => (
                    <button
                      key={r}
                      onClick={() => updateParam("minRating", minRating === String(r) ? "" : String(r))}
                      className={`flex items-center gap-1.5 w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
                        minRating === String(r)
                          ? "bg-gold-400/20 text-gold-300 font-medium"
                          : "text-surface-100 hover:bg-surface-800"
                      }`}
                    >
                      {Array.from({ length: r }).map((_, i) => (
                        <Star key={i} size={12} className="fill-gold-400 text-gold-400" />
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
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold-400/20 px-3 py-1 text-xs font-medium text-gold-300">
                    {category} <button onClick={() => updateParam("category", "")}><X size={12} /></button>
                  </span>
                )}
                {brand && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold-400/20 px-3 py-1 text-xs font-medium text-gold-300">
                    {brand} <button onClick={() => updateParam("brand", "")}><X size={12} /></button>
                  </span>
                )}
                {minRating && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold-400/20 px-3 py-1 text-xs font-medium text-gold-300">
                    {minRating}+ stars <button onClick={() => updateParam("minRating", "")}><X size={12} /></button>
                  </span>
                )}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-400 border-t-transparent" />
              </div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-5">
                {results.map((product: any, i: number) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))}
              </div>
            ) : query || hasActiveFilters ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="rounded-full bg-surface-800 p-6 mb-4 border border-surface-300/30">
                  <Search size={36} className="text-surface-200" />
                </div>
                <h3 className="text-lg font-semibold text-white">No results found</h3>
                <p className="mt-1 text-sm text-surface-100 max-w-md">
                  Try different keywords or adjust your filters.
                </p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="mt-4 rounded-xl bg-gold-400/20 px-4 py-2 text-sm font-medium text-gold-300 hover:bg-gold-400/30 transition-colors">
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="rounded-full bg-surface-800 p-6 mb-4 border border-surface-300/30">
                  <Search size={36} className="text-surface-200" />
                </div>
                <h3 className="text-lg font-semibold text-white">Start searching</h3>
                <p className="mt-1 text-sm text-surface-100">
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
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-surface-950"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-400 border-t-transparent" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
