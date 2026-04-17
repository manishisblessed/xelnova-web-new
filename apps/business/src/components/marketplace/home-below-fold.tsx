'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Zap, ShoppingBag, Eye, Star,
  Truck, RotateCcw, ShieldCheck, Headphones, Flame,
  ChevronRight, ArrowRight, Smartphone,
  Wallet, Gift, Award, Sparkles,
} from 'lucide-react';
import { productsApi } from '@xelnova/api';
import type { Banner } from '@xelnova/api';
import { ProductCard } from '@/components/marketplace/product-card';
import { FlashDealCard } from '@/components/marketplace/flash-deal-card';
import { SectionHeader } from '@/components/marketplace/section-header';
import { CategoryImageOrIcon } from '@/components/marketplace/category-image-or-icon';
import { BrandTile } from '@/components/marketplace/brand-tile';
import { useProducts, useFlashDeals, useCategories } from '@/lib/api';
import { priceInclusiveOfGst } from '@xelnova/utils';

const trustFeatures = [
  { icon: Truck, title: 'Free Delivery', desc: 'On orders over ₹499' },
  { icon: RotateCcw, title: 'Easy Returns', desc: '7-day hassle-free returns' },
  { icon: ShieldCheck, title: 'Secure Payments', desc: '100% protected checkout' },
  { icon: Headphones, title: '24/7 Support', desc: "We're here to help" },
];

const reviewColors = [
  'bg-primary-100 text-primary-700',
  'bg-accent-100 text-accent-700',
  'bg-info-100 text-info-600',
  'bg-warning-100 text-warning-700',
  'bg-success-100 text-success-700',
  'bg-danger-100 text-danger-700',
];

function useDealCountdown(endAt?: string) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    if (!endAt) return;
    function calc() {
      const diff = new Date(endAt!).getTime() - Date.now();
      if (diff <= 0) return { h: 0, m: 0, s: 0 };
      return {
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      };
    }
    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [endAt]);

  return timeLeft;
}

export function HomeBelowFold() {
  const { data: productsData } = useProducts({ limit: 50 });
  const { data: flashDeals, loading: flashDealsLoading } = useFlashDeals();
  const { data: categories } = useCategories();
  const [promoBanners, setPromoBanners] = useState<Banner[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string; slug: string; logo: string | null; featured: boolean }[]>([]);
  const [topReviews, setTopReviews] = useState<{ id: string; rating: number; title: string | null; comment: string | null; helpful: number; createdAt: string; user: { id: string; name: string; avatar: string | null }; product: { name: string; slug: string; images: string[] } }[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      productsApi.getBanners('promo'),
      productsApi.getBrands(),
      productsApi.getTopReviews(),
    ]).then(([bannersResult, brandsResult, reviewsResult]) => {
      if (cancelled) return;
      if (bannersResult.status === 'fulfilled' && bannersResult.value?.length) setPromoBanners(bannersResult.value);
      if (brandsResult.status === 'fulfilled' && brandsResult.value?.length) setBrands(brandsResult.value);
      if (reviewsResult.status === 'fulfilled' && reviewsResult.value?.length) setTopReviews(reviewsResult.value);
    });
    return () => { cancelled = true; };
  }, []);

  const allProducts = productsData?.products || [];
  const flashDealProducts = flashDeals || [];
  const showFlashDealsSkeleton = flashDealsLoading && flashDealProducts.length === 0;
  const trendingProducts = allProducts.filter((p) => p.isFeatured || p.rating >= 4.5).slice(0, 8);
  const newArrivals = [...allProducts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);
  const bestSellers = allProducts.filter((p) => p.rating >= 4.5).sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 8);
  const recommended = allProducts.filter((p) => p.rating >= 4.0).slice(0, 8);
  const dealProduct = allProducts.find((p) => p.discount >= 30 && p.rating >= 4.5) || allProducts[0];
  const dealPriceIncl = dealProduct
    ? priceInclusiveOfGst(dealProduct.price, dealProduct.gstRate)
    : 0;
  const dealCompareIncl = dealProduct
    ? priceInclusiveOfGst(dealProduct.comparePrice, dealProduct.gstRate)
    : 0;
  const dealEndAt = (() => {
    if (dealProduct?.flashDealEndsAt) return dealProduct.flashDealEndsAt;
    const eod = new Date();
    eod.setHours(23, 59, 59, 999);
    return eod.toISOString();
  })();
  const dealCountdown = useDealCountdown(dealEndAt);

  const topSelections = (categories || []).slice(0, 3).map((cat) => ({
    id: cat.id,
    slug: cat.slug,
    title: cat.name,
    discount: `${cat.productCount} Products`,
    image: cat.image || '',
    href: `/products?category=${cat.slug}`,
  }));

  return (
    <>
      {/* ─── 5. FLASH DEALS STRIP ─── */}
      <section className="py-4">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="panel-glass overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-56 lg:w-64 bg-gradient-to-br from-violet-600/95 via-purple-600 to-indigo-800 p-6 flex flex-col justify-center items-center text-center relative overflow-hidden border-b md:border-b-0 md:border-r border-white/10 backdrop-blur-sm">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-4 left-4 w-32 h-32 rounded-full bg-white/25 blur-2xl" />
                  <div className="absolute bottom-4 right-4 w-24 h-24 rounded-full bg-accent-400/40 blur-xl" />
                </div>
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-accent-400 flex items-center justify-center mb-4 shadow-accent mx-auto">
                    <Zap className="w-6 h-6 text-white fill-white" />
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-white mb-1 leading-tight font-display">Flash Deals</h2>
                  <p className="text-xs text-white/80 mb-5">Limited time offers</p>
                  <Link
                    href="/products?deals=flash"
                    className="inline-flex items-center gap-1.5 bg-white text-primary-700 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-50 transition-all shadow-lg shadow-black/10 active:scale-95"
                  >
                    View All <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
              <div className="flex-1 overflow-x-auto scrollbar-hide">
                <div className="flex gap-4 p-4 min-w-max">
                  {showFlashDealsSkeleton && (
                    <div className="flex items-center justify-center min-w-[280px] w-full py-10 text-text-muted text-sm">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                        Loading deals…
                      </span>
                    </div>
                  )}
                  {!showFlashDealsSkeleton &&
                    flashDealProducts.map((product) => (
                      <FlashDealCard key={product.id} product={product} />
                    ))}
                  {!flashDealsLoading && flashDealProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center min-w-[min(100%,320px)] w-full py-10 px-4 text-center">
                      <p className="text-sm font-medium text-text-secondary">No flash deals right now</p>
                      <p className="text-xs text-text-muted mt-1 max-w-sm">
                        Check back soon, or browse all products for the best prices.
                      </p>
                      <Link
                        href="/products"
                        className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700"
                      >
                        Browse products
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. TRENDING PRODUCTS ─── */}
      <section className="py-6">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
            <div className="panel-glass p-5 md:p-6">
              <SectionHeader title="Trending Now" subtitle="Products everyone is talking about" seeAllHref="/products?sort=trending" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {trendingProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── NEW ARRIVALS ─── */}
      {newArrivals.length > 0 && (
        <section className="py-6">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
            <div className="panel-glass p-5 md:p-6">
              <SectionHeader title="New Arrivals" subtitle="Just landed — fresh picks for you" seeAllHref="/products?sort=newest" />
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {newArrivals.map((product, i) => (
                  <div key={product.id} className="w-[220px] flex-shrink-0 sm:w-[240px]">
                    <ProductCard product={product} index={i} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── 7. PROMO BANNERS ─── */}
      {promoBanners.length > 0 && (
        <section className="py-4">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {promoBanners.map((banner) => (
                <Link
                  key={banner.id}
                  href={banner.ctaLink || '/products'}
                  className="block relative h-44 md:h-52 rounded-2xl overflow-hidden group shadow-card hover:shadow-card-hover transition-all duration-300"
                >
                  {banner.image && (
                    <Image src={banner.image} alt={banner.title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover group-hover:scale-105 transition-transform duration-700" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                  <div className="absolute inset-0 flex items-center px-8">
                    <div>
                      <span className="inline-block text-[10px] font-bold uppercase tracking-[0.15em] text-white/85 mb-1">{banner.subtitle}</span>
                      <h3 className="text-2xl md:text-3xl font-extrabold text-white font-display">{banner.title}</h3>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-white mt-3 group-hover:gap-2 transition-all">
                        {banner.ctaText || 'Shop Now'} <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── 8. DEAL OF THE DAY ─── */}
      {dealProduct && (
        <section className="py-6">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/75 shadow-elevated backdrop-blur-xl ring-1 ring-primary-100/25">
              <div className="grid md:grid-cols-2">
                {/* Image side */}
                <div className="relative bg-gradient-to-br from-primary-50 via-accent-50/60 to-white flex items-center justify-center p-8 md:p-12 min-h-[280px] md:min-h-[400px]">
                  <div className="absolute top-0 right-0 w-56 h-56 bg-primary-100/50 rounded-full blur-3xl -translate-y-1/4 translate-x-1/4" />
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-accent-100/50 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4" />
                  {dealProduct.images[0] ? (
                    <div className="relative w-full max-w-[320px] aspect-square z-10">
                      <div className="absolute inset-0 rounded-3xl bg-white shadow-elevated" />
                      <Image
                        src={dealProduct.images[0]}
                        alt={dealProduct.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 360px"
                        className="object-contain relative z-10 p-6"
                      />
                    </div>
                  ) : (
                    <div className="relative z-10 flex flex-col items-center gap-4">
                      <div className="w-28 h-28 rounded-3xl bg-white shadow-lg flex items-center justify-center">
                        <Flame size={48} className="text-danger-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-text-secondary">Today&apos;s Hot Deal</p>
                        <p className="text-xs text-text-muted mt-0.5">Grab it before it&apos;s gone!</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info side */}
                <div className="flex flex-col justify-center p-6 md:p-10">
                  <span className="inline-flex items-center gap-1.5 bg-danger-100 text-danger-700 px-3 py-1 rounded-full text-xs font-bold mb-4 w-fit">
                    <Flame size={12} className="fill-current" /> Deal of the Day
                  </span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary mb-2 font-display leading-tight">
                    {dealProduct.name}
                  </h2>
                  <p className="text-sm text-text-muted mb-5">
                    {[
                      dealProduct.brand,
                      `${dealProduct.rating.toFixed(1)} ★`,
                      `${dealProduct.reviewCount.toLocaleString('en-IN')} reviews`,
                    ].filter(Boolean).join(' · ')}
                  </p>
                  <div className="flex items-baseline gap-3 mb-5">
                    <span className="text-3xl font-extrabold text-text-primary">₹{dealPriceIncl.toLocaleString('en-IN')}</span>
                    {dealCompareIncl > dealPriceIncl && (
                      <>
                        <span className="text-lg text-text-muted line-through">₹{dealCompareIncl.toLocaleString('en-IN')}</span>
                        <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-lg text-sm font-bold">{dealProduct.discount}% OFF</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mb-6">
                    {[
                      { val: String(dealCountdown.h).padStart(2, '0'), label: 'Hours' },
                      { val: String(dealCountdown.m).padStart(2, '0'), label: 'Mins' },
                      { val: String(dealCountdown.s).padStart(2, '0'), label: 'Secs' },
                    ].map((t) => (
                      <div key={t.label} className="bg-surface-dark text-white px-4 py-3 rounded-xl text-center min-w-[56px]">
                        <div className="text-xl font-bold tabular-nums font-display">{t.val}</div>
                        <div className="text-[9px] text-white/70 uppercase tracking-wider mt-0.5">{t.label}</div>
                      </div>
                    ))}
                    <div className="flex items-center ml-1">
                      <div className="w-2 h-2 rounded-full bg-danger-500 animate-pulse mr-1.5" />
                      <span className="text-xs text-danger-600 font-semibold">Live</span>
                    </div>
                  </div>
                  <Link
                    href={`/products/${dealProduct.slug}`}
                    className="inline-flex items-center gap-2 bg-primary-600 text-white px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all shadow-primary active:scale-[0.98] w-fit"
                  >
                    Shop Now <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── 9. BEST SELLERS ─── */}
      {bestSellers.length > 0 && (
        <section className="py-6">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
            <div className="panel-glass p-5 md:p-6">
              <SectionHeader title="Best Sellers" subtitle="Most loved by our customers" seeAllHref="/products?sort=best-selling" />
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {bestSellers.map((product, i) => (
                  <div key={product.id} className="w-[220px] flex-shrink-0 sm:w-[240px]">
                    <ProductCard product={product} index={i} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── 10. TOP SELECTIONS ─── */}
      <section className="py-4">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <SectionHeader title="Top Selection" subtitle="Curated picks at great prices" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topSelections.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="group panel-glass-sm flex items-center gap-5 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_rgba(124,58,237,0.2)]"
              >
                <div className="w-24 h-24 flex-shrink-0 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden flex items-center justify-center border border-border/50">
                  <CategoryImageOrIcon slug={item.slug} name={item.title} imageSrc={item.image} size="lg" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary group-hover:text-primary-700 transition-colors">{item.title}</h3>
                  <p className="text-sm text-primary-600 font-medium mt-0.5">{item.discount}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted group-hover:text-primary-600 mt-3 transition-all">
                    Shop Now <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 11. RECOMMENDED ─── */}
      {recommended.length > 0 && (
        <section className="py-6">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
            <div className="panel-glass p-5 md:p-6">
              <SectionHeader title="Recommended for You" subtitle="Handpicked based on top ratings" seeAllHref="/products" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {recommended.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── SHOP BY PRICE RANGE ─── */}
      <section className="py-6">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <SectionHeader title="Shop by Budget" subtitle="Find products that fit your budget" accent />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-5">
            {[
              { label: 'Under ₹499', range: '0-499', gradient: 'from-emerald-500 to-teal-600', lightGradient: 'from-emerald-50 to-teal-50', icon: '💰', iconBg: 'bg-emerald-100' },
              { label: 'Under ₹999', range: '0-999', gradient: 'from-blue-500 to-indigo-600', lightGradient: 'from-blue-50 to-indigo-50', icon: '🛍️', iconBg: 'bg-blue-100' },
              { label: 'Under ₹1,999', range: '0-1999', gradient: 'from-purple-500 to-violet-600', lightGradient: 'from-purple-50 to-violet-50', icon: '✨', iconBg: 'bg-purple-100' },
              { label: 'Premium', range: '2000-99999', gradient: 'from-amber-500 to-orange-600', lightGradient: 'from-amber-50 to-orange-50', icon: '👑', iconBg: 'bg-amber-100' },
            ].map((tier, i) => (
              <Link
                key={tier.range}
                href={`/products?priceRange=${tier.range}`}
                className="group card-3d shine-effect relative overflow-hidden rounded-2xl p-6 text-center bg-white border border-white/80 ring-1 ring-gray-100/50"
              >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${tier.lightGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                {/* Animated ring */}
                <div className={`absolute -inset-1 bg-gradient-to-r ${tier.gradient} rounded-2xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500`} />
                
                {/* Icon with bounce */}
                <div className={`relative z-10 w-14 h-14 ${tier.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:scale-110`}>
                  <span className="text-2xl">{tier.icon}</span>
                </div>
                
                <h3 className="relative z-10 text-lg font-bold text-text-primary group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:${tier.gradient} transition-all duration-300">
                  {tier.label}
                </h3>
                <p className="relative z-10 text-xs text-text-muted mt-1.5">Free delivery included</p>
                <span className={`relative z-10 inline-flex items-center gap-1.5 text-xs font-bold mt-4 px-3 py-1.5 rounded-full bg-gradient-to-r ${tier.gradient} text-white shadow-sm group-hover:shadow-md group-hover:gap-2 transition-all duration-300`}>
                  Explore <ArrowRight size={12} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CURATED COLLECTIONS ─── */}
      <section className="py-6">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <SectionHeader title="Curated Collections" subtitle="Hand-picked for every occasion" accent />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Work From Home Essentials', desc: 'Desks, chairs, tech & more', gradient: 'from-blue-600 to-indigo-700', href: '/products?collection=wfh', icon: '💻' },
              { title: 'Wedding Season Picks', desc: 'Outfits, gifts & decorations', gradient: 'from-rose-500 to-pink-600', href: '/products?collection=wedding', icon: '💍' },
              { title: 'Summer Must-Haves', desc: 'Stay cool this season', gradient: 'from-amber-500 to-orange-600', href: '/products?collection=summer', icon: '☀️' },
              { title: 'Fitness & Wellness', desc: 'Gym gear, supplements & yoga', gradient: 'from-emerald-500 to-teal-600', href: '/products?collection=fitness', icon: '💪' },
              { title: 'Home Makeover', desc: 'Decor, furniture & organization', gradient: 'from-violet-500 to-purple-600', href: '/products?collection=home', icon: '🏠' },
              { title: 'Tech Accessories', desc: 'Cases, chargers & gadgets', gradient: 'from-cyan-500 to-blue-600', href: '/products?collection=tech', icon: '📱' },
            ].map((collection) => (
              <Link
                key={collection.title}
                href={collection.href}
                className={`group shine-effect relative overflow-hidden rounded-3xl bg-gradient-to-br ${collection.gradient} p-7 min-h-[160px] flex flex-col justify-between shadow-lg shadow-black/10 hover:shadow-2xl hover:shadow-black/15 hover:-translate-y-2 hover:scale-[1.02] transition-all duration-400`}
              >
                {/* Animated background shapes */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
                  <div className="absolute top-4 right-4 w-24 h-24 rounded-full bg-white/[0.08] blur-sm group-hover:scale-150 group-hover:bg-white/[0.12] transition-all duration-700" />
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/[0.04] blur-md group-hover:scale-125 transition-transform duration-700" />
                </div>
                
                {/* Collection icon */}
                <div className="relative text-3xl opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all duration-300 w-fit">
                  {collection.icon}
                </div>
                
                <div className="relative">
                  <h3 className="text-xl font-bold text-white mb-1.5 drop-shadow-sm">{collection.title}</h3>
                  <p className="text-sm text-white/80">{collection.desc}</p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white mt-4 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full w-fit group-hover:bg-white/30 group-hover:gap-2.5 transition-all duration-300">
                    Shop Collection <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 12. BRAND SHOWCASE ─── */}
      {brands.length > 0 && (
        <section className="py-6">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
            <SectionHeader title="Top Brands" subtitle="Shop from the brands you love" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {brands.map((brand) => (
                <BrandTile key={brand.id} name={brand.name} logo={brand.logo} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── 13. CUSTOMER TESTIMONIALS ─── */}
      {topReviews.length > 0 && (
        <section className="py-8">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
            <SectionHeader title="What Our Customers Say" subtitle="Real reviews from real shoppers" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topReviews.slice(0, 3).map((review, i) => {
                const name = review.user?.name || 'Customer';
                const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div
                    key={review.id}
                    className="panel-glass p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_rgba(124,58,237,0.15)]"
                  >
                    <div className="flex items-center gap-1 mb-3">
                      {Array.from({ length: review.rating }).map((_, j) => (
                        <Star key={j} size={14} className="fill-accent-400 text-accent-400" />
                      ))}
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed mb-5">
                      &ldquo;{review.comment || review.title || 'Great product!'}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 pt-4 border-t border-border/60">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${reviewColors[i % reviewColors.length]}`}>
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{name}</p>
                        <p className="text-xs text-text-muted">on {review.product?.name?.slice(0, 30)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── 14. APP DOWNLOAD CTA ─── */}
      <section className="py-6">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 rounded-3xl p-8 md:p-12 overflow-hidden">
            <div className="absolute inset-0 opacity-[0.04]">
              <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-accent-400 rounded-full blur-3xl" />
            </div>
            <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12">
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs text-white/85 mb-4 font-medium">
                  <Smartphone size={12} /> Available on iOS & Android
                </div>
                <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-3 font-display leading-tight">
                  Shop Anytime,<br />Anywhere
                </h2>
                <p className="text-white/80 mb-6 max-w-md text-sm leading-relaxed">
                  Download the Xelnova app and get <strong className="text-accent-300">₹200 off</strong> on your first order. Exclusive app-only deals await!
                </p>
                <div className="flex gap-3 justify-center md:justify-start">
                  <button className="flex items-center gap-2.5 bg-white text-text-primary px-5 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition shadow-lg">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302-2.302 2.302-2.78-2.302 2.78-2.302zM5.864 2.658L16.8 9.082l-2.302 2.302L5.864 2.658z"/></svg>
                    Google Play
                  </button>
                  <button className="flex items-center gap-2.5 bg-white/10 text-white border border-white/20 px-5 py-3 rounded-xl font-semibold text-sm hover:bg-white/20 transition">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                    App Store
                  </button>
                </div>
              </div>
              <div className="hidden md:flex items-center justify-center">
                <div className="w-48 h-72 bg-white/5 rounded-[2rem] border border-white/10 p-2 relative">
                  <div className="w-full h-full bg-gradient-to-b from-violet-500/50 to-purple-700/50 rounded-[1.5rem] flex items-center justify-center">
                    <div className="text-center">
                      <Image src="/xelnova-icon-green.png" alt="Xelnova" width={56} height={56} className="w-14 h-14 rounded-2xl mx-auto mb-3" />
                      <p className="text-white font-bold text-base font-display">Xelnova</p>
                      <p className="text-white/70 text-[10px] mt-0.5">Shop smart</p>
                    </div>
                  </div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-indigo-800 rounded-b-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 15. TRUST FEATURES ─── */}
      <section className="mt-4 border-t border-border/60 bg-gradient-to-b from-white via-primary-50/20 to-surface-raised py-10">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {trustFeatures.map((item, i) => (
              <div key={i} className="text-center group">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary-100/80 bg-white/90 shadow-sm backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:border-primary-200 group-hover:shadow-md">
                  <item.icon className="h-5 w-5 text-primary-600" />
                </div>
                <h3 className="font-semibold text-text-primary text-sm">{item.title}</h3>
                <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHY SHOP WITH US ─── */}
      <section className="py-8">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <SectionHeader title="Why Xelnova?" subtitle="The smarter way to shop" accent />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {[
              { icon: Wallet, title: 'Xelnova Wallet', desc: 'Add money & pay for recharges, bills & more', color: 'text-emerald-600', bg: 'bg-emerald-50', gradient: 'from-emerald-500 to-teal-500', emoji: '💳' },
              { icon: Gift, title: 'Daily Rewards', desc: 'Earn loyalty points on every purchase', color: 'text-violet-600', bg: 'bg-violet-50', gradient: 'from-violet-500 to-purple-500', emoji: '🎁' },
              { icon: Award, title: 'Genuine Products', desc: '100% authentic from verified sellers', color: 'text-blue-600', bg: 'bg-blue-50', gradient: 'from-blue-500 to-indigo-500', emoji: '✅' },
              { icon: Sparkles, title: 'Best Prices', desc: 'Price match guarantee across the platform', color: 'text-amber-600', bg: 'bg-amber-50', gradient: 'from-amber-500 to-orange-500', emoji: '⭐' },
            ].map((item, i) => (
              <div key={item.title} className="group card-3d shine-effect rounded-2xl p-6 text-center bg-white border border-white/80 ring-1 ring-gray-100/50">
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                
                {/* Icon container with animation */}
                <div className={`relative w-14 h-14 mx-auto mb-4 rounded-2xl ${item.bg} flex items-center justify-center shadow-sm group-hover:shadow-lg group-hover:scale-110 transition-all duration-300`}>
                  <item.icon size={24} className={item.color} />
                  <span className="absolute -top-1 -right-1 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">{item.emoji}</span>
                </div>
                
                <h3 className="text-sm font-bold text-text-primary group-hover:text-primary-700 transition-colors">{item.title}</h3>
                <p className="text-xs text-text-muted mt-1.5 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BLOG / BUYING GUIDES ─── */}
      <section className="py-6">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <SectionHeader title="Buying Guides & Tips" subtitle="Make informed purchase decisions" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'How to Choose the Right Laptop', category: 'Electronics', color: 'bg-blue-500', href: '/blog/choose-laptop' },
              { title: 'Fashion Trends for 2026', category: 'Fashion', color: 'bg-pink-500', href: '/blog/fashion-trends' },
              { title: 'Home Organization Hacks', category: 'Home & Living', color: 'bg-emerald-500', href: '/blog/organization' },
            ].map((post) => (
              <Link
                key={post.title}
                href={post.href}
                className="group panel-glass overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_rgba(124,58,237,0.15)]"
              >
                <div className={`h-2 ${post.color}`} />
                <div className="p-5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{post.category}</span>
                  <h3 className="text-sm font-bold text-text-primary mt-1.5 group-hover:text-primary-700 transition-colors">{post.title}</h3>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 mt-3 group-hover:gap-2 transition-all">
                    Read More <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 16. RECENTLY VIEWED ─── */}
      <section className="py-6 pb-10">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <SectionHeader title="Recently Viewed" />
          <div className="panel-glass-sm flex items-center justify-center rounded-2xl border border-dashed border-primary-200/50 bg-primary-50/25 py-14 text-center backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-2xl bg-surface-raised p-4">
                <Eye size={28} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-muted">Start browsing to see recently viewed products</p>
              <Link
                href="/products"
                className="mt-2 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 shadow-primary"
              >
                Browse Products
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
