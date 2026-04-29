'use client';

import { motion } from 'framer-motion';
import { StoreProductCardEnhanced } from './store-product-card-enhanced';
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
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {!showAll && products.length > 10 && (
          <span className="text-sm text-surface-100">
            Showing {displayProducts.length} of {products.length}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {displayProducts.map((product, i) => (
          <StoreProductCardEnhanced key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  );
}
