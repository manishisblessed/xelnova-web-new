'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import {
  TrendingUp, ArrowRight, Package, Users, Store, Truck,
} from 'lucide-react';
import { searchApi, productsApi } from '@xelnova/api';
import type { Banner } from '@xelnova/api';
import { HeroCarousel } from '@/components/marketplace/hero-carousel';
import { CategoryCard } from '@/components/marketplace/category-card';
import { useCategories } from '@/lib/api';

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

const fallbackSearches: string[] = [];

const defaultSidePromos: { image: string; title: string; subtitle: string; href: string; badge: string; accent: string }[] = [];

const statIcons = [Package, Store, Users, Truck];

function formatStatValue(key: string, val: number): string {
  if (key === 'orders') return val > 0 ? 'FREE' : 'FREE';
  if (val >= 10_000_000) return `${(val / 1_000_000).toFixed(0)}M+`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M+`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K+`;
  if (val > 0) return `${val}+`;
  return '0';
}

const statLabels: Record<string, string> = {
  products: 'Products',
  sellers: 'Trusted Sellers',
  customers: 'Happy Customers',
  orders: 'Delivery over ₹499',
};

export default function HomePage() {
  const { data: categories } = useCategories();
  const [trendingSearches, setTrendingSearches] = useState(fallbackSearches);
  const [stats, setStats] = useState<{ icon: typeof Package; value: string; label: string }[]>([
    { icon: Package, value: '...', label: 'Products' },
    { icon: Store, value: '...', label: 'Trusted Sellers' },
    { icon: Users, value: '...', label: 'Happy Customers' },
    { icon: Truck, value: 'FREE', label: 'Delivery over ₹499' },
  ]);
  const [sidePromos, setSidePromos] = useState(defaultSidePromos);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      searchApi.getPopularSearches(),
      productsApi.getStats(),
      productsApi.getBanners('side'),
    ]).then(([searchesResult, statsResult, bannersResult]) => {
      if (cancelled) return;
      if (searchesResult.status === 'fulfilled' && searchesResult.value?.length) {
        setTrendingSearches(searchesResult.value);
      }
      if (statsResult.status === 'fulfilled') {
        const data = statsResult.value;
        const keys = ['products', 'sellers', 'customers', 'orders'] as const;
        setStats(keys.map((key, i) => ({
          icon: statIcons[i],
          value: key === 'orders' ? 'FREE' : formatStatValue(key, data[key]),
          label: statLabels[key],
        })));
      }
      if (bannersResult.status === 'fulfilled') {
        const banners = bannersResult.value;
        if (banners?.length >= 2) {
          const accentColors = ['from-primary-500/80 to-primary-700/90', 'from-accent-500/80 to-accent-700/90'];
          setSidePromos(banners.slice(0, 2).map((b: any, i: number) => ({
            image: b.image || defaultSidePromos[i]?.image || '',
            title: b.title,
            subtitle: b.subtitle || '',
            href: b.ctaLink || '/products',
            badge: b.ctaText || '',
            accent: accentColors[i % 2],
          })));
        }
      }
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen mesh-hero">

      {/* ─── 1. BENTO HERO GRID ─── */}
      <section className="pt-3 pb-2">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className={`grid grid-cols-1 ${sidePromos.length > 0 ? 'lg:grid-cols-4' : ''} gap-3 lg:h-[420px]`}>
            <div className={`${sidePromos.length > 0 ? 'lg:col-span-3' : ''} h-[220px] sm:h-[300px] lg:h-full`}>
              <HeroCarousel />
            </div>
            {sidePromos.length > 0 && (
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
            )}
          </div>
        </div>
      </section>

      {/* ─── 2. TRENDING SEARCHES ─── */}
      {trendingSearches.length > 0 && (
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
      )}

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
                  <div className="text-xs text-white/80 mt-0.5 font-medium">{stat.label}</div>
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
              {(categories || []).map((cat, i) => (
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
