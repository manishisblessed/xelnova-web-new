"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/marketplace/product-card";
import { listingProductToCardProduct } from "@/lib/marketplace/listing-to-card-product";

interface Product {
  id: string; name: string; slug: string; price: number; compareAtPrice?: number;
  images: string[]; rating: number; reviewCount: number; brand: string;
  category: string; stock: number; tags: string[];
}

interface Brand {
  id: string; name: string; slug: string; logo?: string | null; featured: boolean;
}

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];

export default function BrandPageClient({
  slug,
  brand,
  products,
}: {
  slug: string;
  brand: Brand | null;
  products: Product[];
}) {
  const [sort, setSort] = useState("relevance");
  const brandName = brand?.name || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    switch (sort) {
      case "price-asc": sorted.sort((a, b) => a.price - b.price); break;
      case "price-desc": sorted.sort((a, b) => b.price - a.price); break;
      case "rating": sorted.sort((a, b) => b.rating - a.rating); break;
      default: break;
    }
    return sorted;
  }, [products, sort]);

  const mappedProducts = useMemo(
    () =>
      sortedProducts.map((p) => {
        const raw = p as { category?: string | { name?: string } };
        const cat =
          raw.category && typeof raw.category === "object" && raw.category.name != null
            ? raw.category.name
            : typeof raw.category === "string"
              ? raw.category
              : "";
        return listingProductToCardProduct(
          {
            ...p,
            brand: p.brand || brandName,
            category: cat,
            tags: p.tags || [],
          },
          { categoryLabel: cat || "Products", defaultBrand: brandName }
        );
      }),
    [sortedProducts, brandName]
  );

  return (
    <div className="min-h-screen bg-surface-raised">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-text-secondary mb-6">
          <Link href="/" className="hover:text-primary-600 transition-colors">Home</Link>
          <ChevronRight size={14} />
          <Link href="/products" className="hover:text-primary-600 transition-colors">Products</Link>
          <ChevronRight size={14} />
          <span className="text-text-primary font-medium">{brandName}</span>
        </nav>

        {/* Header */}
        <div className="mb-8 flex items-center gap-5">
          {brand?.logo && (
            <Image src={brand.logo} alt={brandName} width={64} height={64} className="w-16 h-16 rounded-2xl object-contain border border-border bg-white p-2" />
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary font-display">{brandName}</h1>
            <p className="text-sm text-text-muted mt-1">{products.length} product{products.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-text-secondary">{sortedProducts.length} results</p>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-2 rounded-xl border border-border bg-white text-sm text-text-primary">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Products Grid */}
        {mappedProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-secondary">No products found for this brand.</p>
            <Link href="/products" className="text-primary-600 hover:underline mt-2 inline-block">Browse all products</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:gap-5">
            {mappedProducts.map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <ProductCard product={product} index={i} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
