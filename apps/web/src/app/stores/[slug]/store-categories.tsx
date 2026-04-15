'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import type { SellerStoreCategory } from '@xelnova/api';

interface StoreCategoriesProps {
  categories: SellerStoreCategory[];
  slug: string;
}

export function StoreCategories({ categories, slug }: StoreCategoriesProps) {
  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 text-4xl">📦</div>
        <h3 className="text-lg font-semibold text-white">No categories yet</h3>
        <p className="mt-1 text-sm text-surface-100">
          This store&apos;s products haven&apos;t been categorized yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-white">Shop by Category</h2>
      
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {categories.map((category, i) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <Link
              href={`/stores/${slug}?category=${category.slug}`}
              className="group block overflow-hidden rounded-2xl border border-surface-300/30 bg-surface-800 transition-all hover:border-gold-400/50 hover:shadow-lg hover:shadow-gold-400/10"
            >
              {/* Image */}
              <div className="relative aspect-square overflow-hidden bg-surface-700">
                {category.image ? (
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="w-12 h-12 text-surface-400" />
                  </div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Product Count Badge */}
                <div className="absolute top-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  {category.productCount} items
                </div>
              </div>

              {/* Name */}
              <div className="p-4">
                <h3 className="font-semibold text-white group-hover:text-gold-400 transition-colors">
                  {category.name}
                </h3>
                <p className="mt-1 text-sm text-surface-100">
                  {category.productCount} product{category.productCount !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
