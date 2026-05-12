'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, Package, Users, Store, Truck,
} from 'lucide-react';
import { productsApi } from '@xelnova/api';
import type { Banner } from '@xelnova/api';
import { HeroCarousel } from '@/components/marketplace/hero-carousel';
import { CategoryCard } from '@/components/marketplace/category-card';
import { HomeFilterBar } from '@/components/marketplace/home-filter-bar';
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

/** Horizontal category icon strip under the hero. Set `true` when you want it visible. */
const SHOW_HOME_CATEGORY_STRIP = false;

export default function HomePage() {
  const { data: categories } = useCategories();
  const [stats, setStats] = useState<{ icon: typeof Package; value: string; label: string }[]>([
    { icon: Package, value: '...', label: 'Products' },
    { icon: Store, value: '...', label: 'Trusted Sellers' },
    { icon: Users, value: '...', label: 'Happy Customers' },
    { icon: Truck, value: 'FREE', label: 'Delivery over ₹499' },
  ]);
  const [sidePromos, setSidePromos] = useState(defaultSidePromos);
  const [brands, setBrands] = useState<{ id: string; name: string; slug: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      productsApi.getStats(),
      productsApi.getBanners('side'),
      productsApi.getBrands(),
    ]).then(([statsResult, bannersResult, brandsResult]) => {
      if (cancelled) return;
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
      if (brandsResult.status === 'fulfilled' && brandsResult.value?.length) {
        setBrands(brandsResult.value.map((b: any) => ({
          id: b.id,
          name: b.name,
          slug: b.slug || b.name.toLowerCase().replace(/\s+/g, '-'),
        })));
      }
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen mesh-hero">
      {/* ─── FILTER BAR ─── */}
      <HomeFilterBar categories={categories || []} brands={brands} />

      {/* ─── 1. BENTO HERO GRID ─── */}
      <section className="pt-3 pb-2">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className={`grid grid-cols-1 ${sidePromos.length > 0 ? 'lg:grid-cols-4' : ''} gap-3 lg:gap-4 lg:h-[420px]`}>
            <div className={`${sidePromos.length > 0 ? 'lg:col-span-3' : ''} min-h-[200px] h-[clamp(200px,52vw,260px)] sm:h-[300px] lg:h-full`}>
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

      {/* ─── 2. SOCIAL PROOF STATS (hidden for now — uncomment to restore) ─── */}
      {/* <section className="py-5">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="stats-ribbon p-5 md:p-7">
            <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.12]">
              <div className="absolute top-0 left-1/4 h-44 w-44 rounded-full bg-white blur-3xl" />
              <div className="absolute right-1/4 bottom-0 h-60 w-60 rounded-full bg-accent-300/80 blur-3xl" />
            </div>
            <div className="relative z-10 grid grid-cols-2 gap-3 text-center md:grid-cols-4 md:gap-4">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="group flex flex-col items-center rounded-2xl border border-white/15 bg-white/10 px-3 py-4 backdrop-blur-md transition-all duration-300 hover:bg-white/18 hover:border-white/25 hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-105">
                    <stat.icon className="h-5 w-5 text-white/95" />
                  </div>
                  <div className="text-2xl md:text-3xl font-extrabold text-white font-display tracking-tight drop-shadow-sm">{stat.value}</div>
                  <div className="mt-1 text-[11px] md:text-xs font-medium text-white/85 leading-snug max-w-[9rem] mx-auto">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section> */}

      {/* ─── 3. CATEGORIES (toggle SHOW_HOME_CATEGORY_STRIP) ─── */}
      {SHOW_HOME_CATEGORY_STRIP && (
        <section className="py-5">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
            <div className="relative panel-glass py-6 px-3 sm:py-7 sm:px-6 transition-all duration-500 hover:shadow-[0_24px_56px_-14px_rgba(12,131,31,0.22)]">
              {/* Decorative background shapes */}
              <div className="absolute inset-0 overflow-hidden rounded-[1.25rem] pointer-events-none">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br from-primary-200/30 to-transparent rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-tl from-accent-200/25 to-transparent rounded-full blur-2xl" />
              </div>

              <div
                className="relative flex gap-4 overflow-x-auto overscroll-x-contain scroll-smooth scrollbar-hide pb-2 pt-1 snap-x snap-mandatory sm:gap-6 md:gap-8"
                style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
              >
                {(categories || []).map((cat, i) => (
                  <div key={cat.id} className="snap-start shrink-0 min-w-[4.75rem] sm:min-w-[5.5rem] md:min-w-0 md:shrink">
                    <CategoryCard category={cat} index={i} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── Below-the-fold content (lazy loaded) ─── */}
      <HomeBelowFold />
    </div>
  );
}
