'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import {
  TrendingUp, ArrowRight, Package, Users, Store, Truck,
} from 'lucide-react';
import { HeroCarousel } from '@/components/marketplace/hero-carousel';
import { CategoryCard } from '@/components/marketplace/category-card';
import { categories } from '@/lib/data/categories';

const HomeBelowFold = dynamic(
  () => import('@/components/marketplace/home-below-fold').then((m) => m.HomeBelowFold),
  {
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    ),
  }
);

const trendingSearches = ['iPhone 16', 'Air Jordans', 'Samsung S25', 'PS5 Slim', 'MacBook Air', 'boAt Earbuds', 'Levi\'s Jeans'];

const stats = [
  { icon: Package, value: '50,000+', label: 'Products' },
  { icon: Store, value: '500+', label: 'Trusted Sellers' },
  { icon: Users, value: '10M+', label: 'Happy Customers' },
  { icon: Truck, value: 'FREE', label: 'Delivery over ₹499' },
];

const sidePromos = [
  { image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop', title: 'New Arrivals', subtitle: 'Spring Collection \'26', href: '/products?sort=newest', badge: 'Just In', accent: 'from-primary-500/80 to-primary-700/90' },
  { image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=400&h=300&fit=crop', title: 'Clearance', subtitle: 'Up to 80% Off', href: '/products?deals=clearance', badge: 'Last Chance', accent: 'from-accent-500/80 to-accent-700/90' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen mesh-hero">

      {/* ─── 1. BENTO HERO GRID ─── */}
      <section className="pt-3 pb-2">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 lg:h-[420px]">
            <div className="lg:col-span-3 h-[220px] sm:h-[300px] lg:h-full">
              <HeroCarousel />
            </div>
            <div className="hidden lg:grid grid-rows-2 gap-3 h-full">
              {sidePromos.map((promo) => (
                <Link key={promo.title} href={promo.href} className="relative rounded-2xl overflow-hidden group">
                  <Image src={promo.image} alt={promo.title} fill sizes="220px" className="object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className={`absolute inset-0 bg-gradient-to-t ${promo.accent}`} />
                  <div className="absolute inset-0 flex flex-col justify-end p-5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/70 mb-1">{promo.badge}</span>
                    <h3 className="text-lg font-bold text-white leading-tight">{promo.title}</h3>
                    <p className="text-xs text-white/70 mt-0.5">{promo.subtitle}</p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-white mt-2 group-hover:gap-2 transition-all">
                      Shop Now <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. TRENDING SEARCHES ─── */}
      <section className="pb-2">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide py-1">
            <span className="flex-shrink-0 text-xs font-semibold text-text-muted flex items-center gap-1">
              <TrendingUp size={12} className="text-primary-500" /> Trending:
            </span>
            {trendingSearches.map((term) => (
              <Link
                key={term}
                href={`/products?search=${encodeURIComponent(term)}`}
                className="flex-shrink-0 text-xs bg-white border border-border/60 rounded-full px-3.5 py-1.5 text-text-secondary hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. SOCIAL PROOF STATS ─── */}
      <section className="py-4">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-primary-800 rounded-2xl p-5 md:p-7 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.07]">
              <div className="absolute top-0 left-1/4 w-40 h-40 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-56 h-56 bg-accent-400 rounded-full blur-3xl" />
            </div>
            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {stats.map((stat, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-2.5">
                    <stat.icon className="w-5 h-5 text-primary-200" />
                  </div>
                  <div className="text-2xl md:text-3xl font-extrabold text-white font-display">{stat.value}</div>
                  <div className="text-xs text-white/50 mt-0.5 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. CATEGORIES ─── */}
      <section className="py-4">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="bg-white rounded-2xl border border-border/60 py-5 px-4 shadow-card">
            <div className="flex items-center justify-between sm:justify-center gap-4 sm:gap-8 lg:gap-12 overflow-x-auto scrollbar-hide">
              {categories.map((cat, i) => (
                <CategoryCard key={cat.id} category={cat} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Below-the-fold content (lazy loaded) ─── */}
      <HomeBelowFold />
    </div>
  );
}
