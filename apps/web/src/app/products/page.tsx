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
  const [selectedBrands, setSelectedBrands] = useState<string[]>(() => {
    const brand = searchParams.get("brand");
    return brand ? brand.split(",") : [];
  });
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>(() => ({
    min: searchParams.get("minPrice") || "",
    max: searchParams.get("maxPrice") || "",
  }));
  const [minRating, setMinRating] = useState<number>(() => {
    const rating = searchParams.get("minRating");
    return rating ? parseInt(rating, 10) : 0;
  });
  const [minDiscount, setMinDiscount] = useState<number>(() => {
    const discount = searchParams.get("discount");
    if (discount === "all") return 1;
    return discount ? parseInt(discount, 10) : 0;
  });
  const [inStockOnly, setInStockOnly] = useState(() => {
    const availability = searchParams.get("availability");
    return availability === "in-stock";
  });
  const [sort, setSort] = useState(searchParams.get("sort") || "relevance");
  const [deliveryFilter, setDeliveryFilter] = useState(searchParams.get("delivery") || "");
  const [dealsFilter, setDealsFilter] = useState(searchParams.get("deals") || "");

  const { data: productsData, loading, error: productsError } = useProducts({ limit: 100 });
  const allProducts = useMemo(() => productsData?.products || [], [productsData]);

  const brands = useMemo(() => [...new Set(allProducts.map((p) => p.brand).filter(Boolean))].sort(), [allProducts]);

  const searchParamsKey = searchParams.toString();

  useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    const cat = params.get("category");
    setSelectedCategories(cat ? cat.split(",").map((c) => c.trim()).filter(Boolean) : []);
    const brand = params.get("brand");
    setSelectedBrands(brand ? brand.split(",").map((b) => b.trim()).filter(Boolean) : []);
    const minPrice = params.get("minPrice");
    const maxPrice = params.get("maxPrice");
    setPriceRange({ min: minPrice || "", max: maxPrice || "" });
    const rating = params.get("minRating");
    setMinRating(rating ? parseInt(rating, 10) : 0);
    const discount = params.get("discount");
    setMinDiscount(discount === "all" ? 1 : discount ? parseInt(discount, 10) : 0);
    const availability = params.get("availability");
    setInStockOnly(availability === "in-stock");
    const s = params.get("sort");
    setSort(s || "relevance");
    const delivery = params.get("delivery");
    setDeliveryFilter(delivery || "");
    const deals = params.get("deals");
    setDealsFilter(deals || "");
  }, [searchParamsKey]);

  const filteredProducts = useMemo(() => {
    let result = [...allProducts];
    
    if (selectedCategories.length > 0) {
      result = result.filter((p) => {
        const productCat = p.category;
        if (selectedCategories.includes(productCat)) return true;
        const cat = categories.find((c) => c.id === productCat);
        return cat && selectedCategories.includes(cat.slug);
      });
    }
    if (selectedBrands.length > 0) result = result.filter((p) => selectedBrands.includes(p.brand) || selectedBrands.some(b => p.brand?.toLowerCase().replace(/\s+/g, '-') === b));
    if (priceRange.min) result = result.filter((p) => p.price >= Number(priceRange.min));
    if (priceRange.max) result = result.filter((p) => p.price <= Number(priceRange.max));
    if (minRating > 0) result = result.filter((p) => p.rating >= minRating);
    if (minDiscount > 0) result = result.filter((p) => p.discount >= minDiscount);
    if (inStockOnly) result = result.filter((p) => p.inStock);
    if (dealsFilter === 'today' || dealsFilter === 'flash') {
      result = result.filter((p) => p.isFlashDeal || p.discount >= 20);
    }
    switch (sort) {
      case "price-asc": result.sort((a, b) => a.price - b.price); break;
      case "price-desc": result.sort((a, b) => b.price - a.price); break;
      case "rating": result.sort((a, b) => b.rating - a.rating); break;
      case "newest": result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case "popular": result.sort((a, b) => (b.reviewCount + (b.isFeatured ? 1000 : 0)) - (a.reviewCount + (a.isFeatured ? 1000 : 0))); break;
    }
    return result;
  }, [allProducts, selectedCategories, selectedBrands, priceRange, minRating, minDiscount, inStockOnly, sort, dealsFilter]);

  const toggleCategory = (slug: string) => {
    const updated = selectedCategories.includes(slug)
      ? selectedCategories.filter((c) => c !== slug)
      : [...selectedCategories, slug];
    setSelectedCategories(updated);
    const params = new URLSearchParams(searchParamsKey);
    if (updated.length > 0) {
      params.set("category", updated.join(","));
    } else {
      params.delete("category");
    }
    router.push(`/products?${params.toString()}`);
  };

  const toggleBrand = (brand: string) => {
    const updated = selectedBrands.includes(brand)
      ? selectedBrands.filter((b) => b !== brand)
      : [...selectedBrands, brand];
    setSelectedBrands(updated);
    const params = new URLSearchParams(searchParamsKey);
    if (updated.length > 0) {
      params.set("brand", updated.join(","));
    } else {
      params.delete("brand");
    }
    router.push(`/products?${params.toString()}`);
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setPriceRange({ min: "", max: "" });
    setMinRating(0);
    setMinDiscount(0);
    setInStockOnly(false);
    setSort("relevance");
    setDeliveryFilter("");
    setDealsFilter("");
    router.push("/products");
  };

  const hasActiveFilters = selectedCategories.length > 0 || selectedBrands.length > 0 || priceRange.min || priceRange.max || minRating > 0 || minDiscount > 0 || inStockOnly || deliveryFilter || dealsFilter;

  return (
    <div className="min-h-screen bg-surface-raised">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary font-display">All Products</h1>
            <p className="mt-1 text-sm text-text-muted">
              {loading ? 'Loading...' : productsError ? (
                <span className="text-danger-600">{productsError} If you are developing locally, ensure the backend is running.</span>
              ) : `Showing ${filteredProducts.length} of ${allProducts.length} results`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-text-secondary hover:border-primary-300 hover:bg-primary-50/50 transition-all lg:hidden"
            >
              <SlidersHorizontal size={16} />
              Filters
              {hasActiveFilters && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">!</span>}
            </button>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-text-primary outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 transition-all"
              >
                {SORT_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>Sort by: {opt.label}</option>))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
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
            {minDiscount > 0 && (<FilterChip onRemove={() => setMinDiscount(0)}>{minDiscount === 1 ? "All Discounts" : `${minDiscount}% off+`}</FilterChip>)}
            {inStockOnly && (<FilterChip onRemove={() => setInStockOnly(false)}>In Stock</FilterChip>)}
            {deliveryFilter && (<FilterChip onRemove={() => setDeliveryFilter("")}>{deliveryFilter === 'tomorrow' ? 'Get It by Tomorrow' : deliveryFilter === '2days' ? 'Get It in 2 Days' : 'Express Delivery'}</FilterChip>)}
            {dealsFilter && (<FilterChip onRemove={() => setDealsFilter("")}>{dealsFilter === 'today' ? "Today's Deals" : "Flash Deals"}</FilterChip>)}
            <button onClick={clearAllFilters} className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">Clear All</button>
          </div>
        )}

        <div className="flex gap-6 lg:gap-8">
          <aside className="hidden w-60 shrink-0 lg:block">
            <div className="sticky top-20 rounded-2xl border border-border bg-white p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-text-primary">Filters</h2>
                {hasActiveFilters && (<button onClick={clearAllFilters} className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors">Clear All</button>)}
              </div>
              <FilterSidebar categories={categories} brands={brands} selectedCategories={selectedCategories} selectedBrands={selectedBrands} priceRange={priceRange} minRating={minRating} minDiscount={minDiscount} inStockOnly={inStockOnly} toggleCategory={toggleCategory} toggleBrand={toggleBrand} setPriceRange={setPriceRange} setMinRating={setMinRating} setMinDiscount={setMinDiscount} setInStockOnly={setInStockOnly} />
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredProducts.map((product, i) => (<ProductCard key={product.id} product={product} index={i} />))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 rounded-full bg-surface-muted p-6"><SlidersHorizontal size={32} className="text-text-muted" /></div>
                <h3 className="text-lg font-semibold text-text-primary">No products found</h3>
                <p className="mt-1 text-sm text-text-muted">Try adjusting your filters to find what you&apos;re looking for.</p>
                <button onClick={clearAllFilters} className="mt-4 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-primary">Clear All Filters</button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {mobileFiltersOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] overflow-y-auto bg-white shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white p-4">
                <h2 className="text-lg font-bold text-text-primary">Filters</h2>
                <button onClick={() => setMobileFiltersOpen(false)} className="rounded-lg p-2 hover:bg-surface-muted transition-colors"><X size={20} className="text-text-secondary" /></button>
              </div>
              <div className="p-4"><FilterSidebar mobile categories={categories} brands={brands} selectedCategories={selectedCategories} selectedBrands={selectedBrands} priceRange={priceRange} minRating={minRating} minDiscount={minDiscount} inStockOnly={inStockOnly} toggleCategory={toggleCategory} toggleBrand={toggleBrand} setPriceRange={setPriceRange} setMinRating={setMinRating} setMinDiscount={setMinDiscount} setInStockOnly={setInStockOnly} /></div>
              <div className="sticky bottom-0 border-t border-border bg-white p-4">
                <button onClick={() => setMobileFiltersOpen(false)} className="w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-primary">
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

interface FilterSidebarProps {
  mobile?: boolean;
  categories: { slug: string; name: string; productCount: number }[];
  brands: string[];
  selectedCategories: string[];
  selectedBrands: string[];
  priceRange: { min: string; max: string };
  minRating: number;
  minDiscount: number;
  inStockOnly: boolean;
  toggleCategory: (slug: string) => void;
  toggleBrand: (brand: string) => void;
  setPriceRange: React.Dispatch<React.SetStateAction<{ min: string; max: string }>>;
  setMinRating: React.Dispatch<React.SetStateAction<number>>;
  setMinDiscount: React.Dispatch<React.SetStateAction<number>>;
  setInStockOnly: React.Dispatch<React.SetStateAction<boolean>>;
}

function FilterSidebar({
  mobile = false, categories, brands, selectedCategories, selectedBrands,
  priceRange, minRating, minDiscount, inStockOnly,
  toggleCategory, toggleBrand, setPriceRange, setMinRating, setMinDiscount, setInStockOnly,
}: FilterSidebarProps) {
  return (
    <div className={cn("space-y-5", mobile && "px-1")}>
      <FilterSection title="Category">
        {categories.map((cat) => (
          <label key={cat.slug} className="flex cursor-pointer items-center gap-2.5 py-1.5">
            <input
              type="checkbox"
              checked={selectedCategories.includes(cat.slug)}
              onChange={() => toggleCategory(cat.slug)}
              className="h-4 w-4 rounded border-gray-300 bg-white text-primary-600 accent-primary-600"
            />
            <span className="text-sm text-text-secondary">{cat.name}</span>
            <span className="ml-auto text-xs text-text-muted">{cat.productCount}</span>
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
              priceRange.min === String(range.min) ? "text-primary-700 font-medium" : "text-text-secondary hover:text-primary-600"
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
            className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-500/20 transition-all"
          />
          <span className="text-text-muted">-</span>
          <input
            type="number"
            placeholder="₹ Max"
            value={priceRange.max}
            onChange={(e) => setPriceRange((p) => ({ ...p, max: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-500/20 transition-all"
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
              className="h-4 w-4 rounded border-gray-300 bg-white text-primary-600 accent-primary-600"
            />
            <span className="text-sm text-text-secondary">{brand}</span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Customer Reviews">
        {[4, 3, 2, 1].map((r) => (
          <button
            key={r}
            onClick={() => setMinRating((prev) => prev === r ? 0 : r)}
            className={cn(
              "flex w-full items-center gap-2 py-1.5 text-sm transition-colors",
              minRating === r ? "text-primary-700 font-medium" : "text-text-secondary hover:text-primary-600"
            )}
          >
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14} className={i < r ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
              ))}
            </div>
            <span>& Up</span>
            {minRating === r && <Check size={14} className="ml-auto text-primary-600" />}
          </button>
        ))}
      </FilterSection>

      <FilterSection title="Discount">
        {DISCOUNT_RANGES.map((d) => (
          <button
            key={d.value}
            onClick={() => setMinDiscount((prev) => prev === d.value ? 0 : d.value)}
            className={cn(
              "block w-full py-1.5 text-left text-sm transition-colors",
              minDiscount === d.value ? "text-primary-700 font-medium" : "text-text-secondary hover:text-primary-600"
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
            className={cn("relative h-5 w-9 rounded-full transition-colors cursor-pointer", inStockOnly ? "bg-primary-500" : "bg-gray-300")}
          >
            <div className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", inStockOnly ? "translate-x-4" : "translate-x-0.5")} />
          </div>
          <span className="text-sm text-text-secondary">In Stock Only</span>
        </label>
      </FilterSection>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-border pb-4">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-1">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <ChevronDown size={16} className={cn("text-text-muted transition-transform", open && "rotate-180")} />
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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
      {children}
      <button onClick={onRemove} className="hover:text-primary-900 transition-colors"><X size={12} /></button>
    </span>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-surface-raised"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" /></div>}>
      <ProductsContent />
    </Suspense>
  );
}
