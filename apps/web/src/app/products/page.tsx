"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal,
  ChevronDown,
  X,
  Star,
  Check,
} from "lucide-react";
import { cn } from "@xelnova/utils";
import { useProducts, useCategories } from "@/lib/api";
import { ProductCard } from "@/components/marketplace/product-card";

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Avg. Customer Reviews" },
  { value: "newest", label: "Newest Arrivals" },
] as const;

const PRICE_RANGES = [
  { label: "Under ₹500", min: 0, max: 500 },
  { label: "₹500 - ₹1,000", min: 500, max: 1000 },
  { label: "₹1,000 - ₹5,000", min: 1000, max: 5000 },
  { label: "₹5,000 - ₹10,000", min: 5000, max: 10000 },
  { label: "₹10,000 - ₹50,000", min: 10000, max: 50000 },
  { label: "Over ₹50,000", min: 50000, max: Infinity },
];

const DISCOUNT_RANGES = [
  { label: "10% off or more", value: 10 },
  { label: "25% off or more", value: 25 },
  { label: "50% off or more", value: 50 },
  { label: "70% off or more", value: 70 },
];

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { data: categoriesData } = useCategories();
  const categories = categoriesData || [];

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const cat = searchParams.get("category");
    return cat ? cat.split(",") : [];
  });
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({
    min: "",
    max: "",
  });
  const [minRating, setMinRating] = useState<number>(0);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState(searchParams.get("sort") || "relevance");

  const { data: productsData, loading } = useProducts({ limit: 100 });
  const allProducts = productsData?.products || [];

  const brands = useMemo(() => [...new Set(allProducts.map((p) => p.brand).filter(Boolean))].sort(), [allProducts]);

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) setSelectedCategories(cat.split(","));
    const s = searchParams.get("sort");
    if (s) setSort(s);
  }, [searchParams]);

  const filteredProducts = useMemo(() => {
    let result = [...allProducts];
    if (selectedCategories.length > 0) result = result.filter((p) => selectedCategories.includes(p.category));
    if (selectedBrands.length > 0) result = result.filter((p) => selectedBrands.includes(p.brand));
    if (priceRange.min) result = result.filter((p) => p.price >= Number(priceRange.min));
    if (priceRange.max) result = result.filter((p) => p.price <= Number(priceRange.max));
    if (minRating > 0) result = result.filter((p) => p.rating >= minRating);
    if (minDiscount > 0) result = result.filter((p) => p.discount >= minDiscount);
    if (inStockOnly) result = result.filter((p) => p.inStock);
    switch (sort) {
      case "price-asc": result.sort((a, b) => a.price - b.price); break;
      case "price-desc": result.sort((a, b) => b.price - a.price); break;
      case "rating": result.sort((a, b) => b.rating - a.rating); break;
      case "newest": result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
    }
    return result;
  }, [allProducts, selectedCategories, selectedBrands, priceRange, minRating, minDiscount, inStockOnly, sort]);

  const toggleCategory = (slug: string) => setSelectedCategories((prev) => prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug]);
  const toggleBrand = (brand: string) => setSelectedBrands((prev) => prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]);

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setPriceRange({ min: "", max: "" });
    setMinRating(0);
    setMinDiscount(0);
    setInStockOnly(false);
    setSort("relevance");
    router.push("/products");
  };

  const hasActiveFilters = selectedCategories.length > 0 || selectedBrands.length > 0 || priceRange.min || priceRange.max || minRating > 0 || minDiscount > 0 || inStockOnly;

  const FilterSidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn("space-y-6", mobile && "px-1")}>
      <FilterSection title="Category">
        {categories.map((cat) => (
          <label key={cat.slug} className="flex cursor-pointer items-center gap-2.5 py-1.5">
            <input
              type="checkbox"
              checked={selectedCategories.includes(cat.slug)}
              onChange={() => toggleCategory(cat.slug)}
              className="h-4 w-4 rounded border-surface-300 bg-surface-700 text-gold-400 accent-gold-400"
            />
            <span className="text-sm text-surface-50">{cat.name}</span>
            <span className="ml-auto text-xs text-surface-200">
              {cat.productCount}
            </span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Price">
        {PRICE_RANGES.map((range) => (
          <button
            key={range.label}
            onClick={() => setPriceRange({ min: String(range.min), max: range.max === Infinity ? "" : String(range.max) })}
            className={cn(
              "block w-full py-1.5 text-left text-sm transition-colors",
              priceRange.min === String(range.min) ? "text-gold-400 font-medium" : "text-surface-100 hover:text-gold-400"
            )}
          >
            {range.label}
          </button>
        ))}
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            placeholder="₹ Min"
            value={priceRange.min}
            onChange={(e) => setPriceRange((p) => ({ ...p, min: e.target.value }))}
            className="w-full rounded-lg border border-surface-300 bg-surface-700 px-2.5 py-1.5 text-sm text-white outline-none focus:border-gold-400"
          />
          <span className="text-surface-200">-</span>
          <input
            type="number"
            placeholder="₹ Max"
            value={priceRange.max}
            onChange={(e) => setPriceRange((p) => ({ ...p, max: e.target.value }))}
            className="w-full rounded-lg border border-surface-300 bg-surface-700 px-2.5 py-1.5 text-sm text-white outline-none focus:border-gold-400"
          />
        </div>
      </FilterSection>

      <FilterSection title="Brand">
        {brands.map((brand) => (
          <label key={brand} className="flex cursor-pointer items-center gap-2.5 py-1.5">
            <input
              type="checkbox"
              checked={selectedBrands.includes(brand)}
              onChange={() => toggleBrand(brand)}
              className="h-4 w-4 rounded border-surface-300 bg-surface-700 text-gold-400 accent-gold-400"
            />
            <span className="text-sm text-surface-50">{brand}</span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Customer Reviews">
        {[4, 3, 2, 1].map((r) => (
          <button
            key={r}
            onClick={() => setMinRating(minRating === r ? 0 : r)}
            className={cn(
              "flex w-full items-center gap-2 py-1.5 text-sm transition-colors",
              minRating === r ? "text-gold-400 font-medium" : "text-surface-100 hover:text-gold-400"
            )}
          >
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14} className={i < r ? "fill-gold-400 text-gold-400" : "text-surface-300"} />
              ))}
            </div>
            <span>& Up</span>
            {minRating === r && <Check size={14} className="ml-auto" />}
          </button>
        ))}
      </FilterSection>

      <FilterSection title="Discount">
        {DISCOUNT_RANGES.map((d) => (
          <button
            key={d.value}
            onClick={() => setMinDiscount(minDiscount === d.value ? 0 : d.value)}
            className={cn(
              "block w-full py-1.5 text-left text-sm transition-colors",
              minDiscount === d.value ? "text-gold-400 font-medium" : "text-surface-100 hover:text-gold-400"
            )}
          >
            {d.label}
          </button>
        ))}
      </FilterSection>

      <FilterSection title="Availability">
        <label className="flex cursor-pointer items-center gap-2.5 py-1.5">
          <div
            onClick={() => setInStockOnly(!inStockOnly)}
            className={cn("relative h-5 w-9 rounded-full transition-colors cursor-pointer", inStockOnly ? "bg-gold-400" : "bg-surface-300")}
          >
            <div className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", inStockOnly ? "translate-x-4" : "translate-x-0.5")} />
          </div>
          <span className="text-sm text-surface-50">In Stock Only</span>
        </label>
      </FilterSection>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white font-display">All Products</h1>
            <p className="mt-1 text-sm text-surface-100">
              {loading ? 'Loading...' : `Showing ${filteredProducts.length} of ${allProducts.length} results`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-surface-300 bg-surface-800 px-4 py-2.5 text-sm font-medium text-surface-50 hover:border-gold-400/50 lg:hidden"
            >
              <SlidersHorizontal size={16} />
              Filters
              {hasActiveFilters && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-400 text-xs text-surface-950">!</span>}
            </button>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none rounded-xl border border-surface-300 bg-surface-800 px-4 py-2.5 pr-10 text-sm font-medium text-surface-50 outline-none focus:border-gold-400"
              >
                {SORT_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>Sort by: {opt.label}</option>))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-surface-200" />
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {selectedCategories.map((slug) => {
              const cat = categories.find((c) => c.slug === slug);
              return <FilterChip key={slug} onRemove={() => toggleCategory(slug)}>{cat?.name ?? slug}</FilterChip>;
            })}
            {selectedBrands.map((brand) => (<FilterChip key={brand} onRemove={() => toggleBrand(brand)}>{brand}</FilterChip>))}
            {(priceRange.min || priceRange.max) && (<FilterChip onRemove={() => setPriceRange({ min: "", max: "" })}>₹{priceRange.min || "0"} - ₹{priceRange.max || "∞"}</FilterChip>)}
            {minRating > 0 && (<FilterChip onRemove={() => setMinRating(0)}>{minRating}★ & Up</FilterChip>)}
            {minDiscount > 0 && (<FilterChip onRemove={() => setMinDiscount(0)}>{minDiscount}% off+</FilterChip>)}
            {inStockOnly && (<FilterChip onRemove={() => setInStockOnly(false)}>In Stock</FilterChip>)}
            <button onClick={clearAllFilters} className="text-sm font-medium text-gold-400 hover:text-gold-300">Clear All</button>
          </div>
        )}

        <div className="flex gap-8">
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-28 rounded-2xl border border-surface-300/50 bg-surface-800 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Filters</h2>
                {hasActiveFilters && (<button onClick={clearAllFilters} className="text-xs font-medium text-gold-400 hover:text-gold-300">Clear All</button>)}
              </div>
              <FilterSidebar />
            </div>
          </aside>

          <main className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-400 border-t-transparent" />
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product, i) => (<ProductCard key={product.id} product={product} index={i} />))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 rounded-full bg-surface-700 p-6"><SlidersHorizontal size={32} className="text-surface-200" /></div>
                <h3 className="text-lg font-semibold text-white">No products found</h3>
                <p className="mt-1 text-sm text-surface-100">Try adjusting your filters to find what you&apos;re looking for.</p>
                <button onClick={clearAllFilters} className="mt-4 rounded-xl bg-gold-400 px-6 py-2.5 text-sm font-semibold text-surface-950 hover:bg-gold-300">Clear All Filters</button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {mobileFiltersOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] overflow-y-auto bg-surface-900"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-300/50 bg-surface-900 p-4">
                <h2 className="text-lg font-bold text-white">Filters</h2>
                <button onClick={() => setMobileFiltersOpen(false)} className="rounded-lg p-2 hover:bg-surface-700"><X size={20} className="text-surface-100" /></button>
              </div>
              <div className="p-4"><FilterSidebar mobile /></div>
              <div className="sticky bottom-0 border-t border-surface-300/50 bg-surface-900 p-4">
                <button onClick={() => setMobileFiltersOpen(false)} className="w-full rounded-xl bg-gold-400 py-3 text-sm font-semibold text-surface-950 hover:bg-gold-300">
                  Show {filteredProducts.length} Results
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-surface-300/30 pb-4">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-1">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <ChevronDown size={16} className={cn("text-surface-200 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterChip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1 text-xs font-medium text-gold-400">
      {children}
      <button onClick={onRemove} className="hover:text-gold-300"><X size={12} /></button>
    </span>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-surface-950"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-400 border-t-transparent" /></div>}>
      <ProductsContent />
    </Suspense>
  );
}
