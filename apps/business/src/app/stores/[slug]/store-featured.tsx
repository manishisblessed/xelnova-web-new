'use client';

import { motion } from 'framer-motion';
import { ProductCard } from '@/components/marketplace/product-card';
import type { Product } from '@/lib/data/products';

interface StoreFeaturedProps {
  products: Product[];
  title: string;
  showAll?: boolean;
}

export function StoreFeatured({ products, title, showAll = false }: StoreFeaturedProps) {
  if (products.length === 0) return null;

  const displayProducts = showAll ? products : products.slice(0, 10);

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary">{title}</h2>
        {!showAll && products.length > 10 && (
          <span className="text-sm text-text-muted">
            Showing {displayProducts.length} of {products.length}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {displayProducts.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  );
}
