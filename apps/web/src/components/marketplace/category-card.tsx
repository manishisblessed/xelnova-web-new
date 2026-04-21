'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Category } from '@/lib/data/categories';
import { CategoryImageOrIcon } from '@/components/marketplace/category-image-or-icon';

export function CategoryCard({ category, index = 0 }: { category: Category; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/products?category=${category.slug}`}
        className="flex flex-col items-center group cursor-pointer"
      >
        <div className="relative mb-3 flex h-18 w-18 md:h-22 md:w-22 items-center justify-center overflow-hidden rounded-3xl border-2 border-white/90 bg-gradient-to-br from-white via-primary-50/40 to-accent-50/30 shadow-lg shadow-primary-500/8 ring-1 ring-primary-200/30 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-2 group-hover:scale-105 group-hover:border-primary-300/70 group-hover:shadow-2xl group-hover:shadow-primary-500/25 group-hover:ring-primary-300/60">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-500/0 via-accent-400/0 to-primary-300/0 opacity-0 transition-all duration-400 group-hover:from-primary-500/12 group-hover:via-accent-400/10 group-hover:to-primary-300/8 group-hover:opacity-100" />

          {/* Floating particles effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-primary-400/60 animate-bounce-subtle" style={{ animationDelay: '0s' }} />
            <div className="absolute bottom-3 right-2 w-1 h-1 rounded-full bg-accent-400/70 animate-bounce-subtle" style={{ animationDelay: '0.5s' }} />
            <div className="absolute top-1/2 right-1 w-1 h-1 rounded-full bg-primary-300/60 animate-bounce-subtle" style={{ animationDelay: '0.25s' }} />
          </div>
          
          {/* Inner glow */}
          <div className="absolute inset-2 rounded-2xl bg-white/60 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300" />
          
          {/* Icon container with bounce */}
          <div className="relative z-10 transition-transform duration-300 group-hover:scale-110">
            <CategoryImageOrIcon slug={category.slug} name={category.name} imageSrc={category.image} size="md" />
          </div>
        </div>
        <span className="block max-w-[120px] sm:max-w-[130px] md:max-w-[145px] px-1 text-[11px] sm:text-xs md:text-sm font-semibold text-text-secondary group-hover:text-primary-700 text-center transition-all duration-300 leading-snug line-clamp-2 break-words group-hover:drop-shadow-sm">
          {category.name}
        </span>
      </Link>
    </motion.div>
  );
}
