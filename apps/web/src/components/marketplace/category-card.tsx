'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Category } from '@/lib/data/categories';

export function CategoryCard({ category, index = 0 }: { category: Category; index?: number }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/products?category=${category.slug}`}
        className="flex flex-col items-center group cursor-pointer"
      >
        <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mb-2.5 overflow-hidden border-2 border-transparent group-hover:border-primary-300 group-hover:shadow-lg group-hover:shadow-primary-500/10 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/0 to-primary-500/0 group-hover:from-primary-500/5 group-hover:to-primary-500/10 transition-all duration-300" />
          {!imageLoaded && <div className="w-10 h-10 md:w-12 md:h-12 animate-shimmer rounded-lg" />}
          <Image
            src={category.image}
            alt={category.name}
            width={56}
            height={56}
            className={`w-10 h-10 md:w-14 md:h-14 object-contain group-hover:scale-110 transition-transform duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
        <span className="text-xs md:text-sm font-medium text-text-secondary group-hover:text-primary-700 text-center transition-colors duration-200 max-w-[80px] truncate">
          {category.name}
        </span>
      </Link>
    </motion.div>
  );
}
