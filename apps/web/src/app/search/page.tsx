"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { products } from "@/lib/data";
import { ProductCard } from "@/components/marketplace/product-card";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";

  const results = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return products.filter((p) => {
      const matchesQuery = p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q)) || p.description.toLowerCase().includes(q);
      const matchesCategory = !category || category === "all" || p.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [query, category]);

  return (
    <div className="min-h-screen bg-surface-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white font-display">
            {query ? <>Search results for &quot;<span className="text-gold-400">{query}</span>&quot;</> : "Search Products"}
          </h1>
          <p className="mt-1 text-sm text-surface-100">{results.length} {results.length === 1 ? "result" : "results"} found</p>
        </div>
        {results.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:gap-5">
            {results.map((product, i) => (<ProductCard key={product.id} product={product} index={i} />))}
          </div>
        ) : query ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-surface-800 p-6 mb-4 border border-surface-300/30"><Search size={36} className="text-surface-200" /></div>
            <h3 className="text-lg font-semibold text-white">No results found</h3>
            <p className="mt-1 text-sm text-surface-100 max-w-md">We couldn&apos;t find any products matching &quot;{query}&quot;. Try different keywords or browse our categories.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-surface-800 p-6 mb-4 border border-surface-300/30"><Search size={36} className="text-surface-200" /></div>
            <h3 className="text-lg font-semibold text-white">Start searching</h3>
            <p className="mt-1 text-sm text-surface-100">Type a product name, brand, or category to find what you need.</p>
          </div>
        )}
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
