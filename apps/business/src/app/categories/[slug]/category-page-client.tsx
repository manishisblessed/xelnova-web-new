"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronRight, SlidersHorizontal, Grid3X3, LayoutList } from "lucide-react";
import { ProductCard } from "@/components/marketplace/product-card";
import { listingProductToCardProduct } from "@/lib/marketplace/listing-to-card-product";

interface Product {
  id: string; name: string; slug: string; price: number; compareAtPrice?: number;
  images: string[]; rating: number; reviewCount: number; brand: string;
  category: string; stock: number; tags: string[];
  seller?: { storeName: string };
}

interface Category {
  id: string; name: string; slug: string; description?: string; image?: string;
  children?: { id: string; name: string; slug: string }[];
  parent?: { id: string; name: string; slug: string } | null;
}

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "newest", label: "Newest" },
];

export default function CategoryPageClient({
  slug,
  initialData,
}: {
  slug: string;
  initialData: { category: Category; products: Product[] } | null;
}) {
  const [sort, setSort] = useState("relevance");

  const category = initialData?.category ?? null;
  const products = useMemo(() => initialData?.products ?? [], [initialData]);

  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    switch (sort) {
      case "price-asc": sorted.sort((a, b) => a.price - b.price); break;
      case "price-desc": sorted.sort((a, b) => b.price - a.price); break;
      case "rating": sorted.sort((a, b) => b.rating - a.rating); break;
      case "newest": break;
      default: break;
    }
    return sorted;
  }, [products, sort]);

  const mappedProducts = useMemo(() => {
    if (!category) return [];
    return sortedProducts.map((p) =>
      listingProductToCardProduct(
        {
          ...p,
          brand: p.brand || "",
          category: category.name,
          tags: p.tags || [],
        },
        { categoryLabel: category.name }
      )
    );
  }, [category, sortedProducts]);

  if (!category) {
    return (
      <div className="min-h-screen bg-surface-raised flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Category Not Found</h1>
          <p className="text-text-secondary mb-4">{"The category you're looking for doesn't exist."}</p>
          <Link href="/products" className="text-primary-600 hover:underline">Browse all products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-raised">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-text-secondary mb-6">
          <Link href="/" className="hover:text-primary-600 transition-colors">Home</Link>
          <ChevronRight size={14} />
          <Link href="/products" className="hover:text-primary-600 transition-colors">Products</Link>
          <ChevronRight size={14} />
          {category.parent && (
            <>
              <Link href={`/categories/${category.parent.slug}`} className="hover:text-primary-600 transition-colors">{category.parent.name}</Link>
              <ChevronRight size={14} />
            </>
          )}
          <span className="text-text-primary font-medium">{category.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start gap-6">
            {category.image && (
              <Image src={category.image} alt={category.name} width={80} height={80} className="w-20 h-20 rounded-2xl object-cover hidden sm:block" />
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary font-display">{category.name}</h1>
              {category.description && <p className="text-text-secondary mt-1 max-w-2xl">{category.description}</p>}
              <p className="text-sm text-text-muted mt-2">{products.length} product{products.length !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Subcategories */}
          {category.children && category.children.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {category.children.map((sub) => (
                <Link key={sub.slug} href={`/categories/${sub.slug}`} className="px-4 py-2 rounded-xl border border-border bg-white text-sm text-text-secondary hover:border-primary-300 hover:text-primary-600 transition-colors">
                  {sub.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sort + Grid */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-text-secondary">{sortedProducts.length} results</p>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-2 rounded-xl border border-border bg-white text-sm text-text-primary">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Products Grid */}
        {mappedProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-secondary">No products found in this category.</p>
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
