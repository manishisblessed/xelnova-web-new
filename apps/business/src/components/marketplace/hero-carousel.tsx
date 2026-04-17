'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';
import { productsApi } from '@xelnova/api';
import type { Banner } from '@xelnova/api';

interface Slide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  badge?: string;
  cta: string;
  href: string;
  accent: string;
  gradient: string;
  pattern?: string;
}

const HERO_STOCK_IMAGES = [
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1920&q=85',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1920&q=85',
  'https://images.unsplash.com/photo-1526178613552-2b45c6c302f0?auto=format&fit=crop&w=1920&q=85',
  'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1920&q=85',
] as const;

/** Hero art for the “Big festive sale” slide (served from `public/images/`). */
const BIG_FESTIVE_SALE_BANNER_IMAGE = '/images/big-festive-sale-banner-design.png';

function isBigFestiveSaleTitle(title: string): boolean {
  return title.trim().toLowerCase() === 'big festive sale';
}

function resolveBannerImage(bannerImage: string | null | undefined, index: number): string {
  const trimmed = bannerImage?.trim();
  if (trimmed) return trimmed;
  return HERO_STOCK_IMAGES[index % HERO_STOCK_IMAGES.length];
}

function isAbsoluteHttpUrl(href: string): boolean {
  return /^https?:\/\//i.test(href.trim());
}

const fallbackSlides: Slide[] = [
  {
    id: 'fb-1',
    image: BIG_FESTIVE_SALE_BANNER_IMAGE,
    title: 'Big Festive Sale',
    subtitle: 'Up to 50% off on top brands. Grab the best deals before they are gone!',
    badge: 'SHOP NOW',
    cta: 'Shop now',
    href: '/products?sort=discount',
    accent: 'bg-gradient-to-r from-rose-500 to-orange-500',
    gradient: 'bg-gradient-to-br from-rose-600 via-purple-700 to-indigo-800',
    pattern: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 50%)',
  },
  {
    id: 'fb-2',
    image: HERO_STOCK_IMAGES[1],
    title: 'New Arrivals',
    subtitle: 'Fresh styles every week. Discover the latest in fashion, electronics & more.',
    badge: 'EXPLORE',
    cta: 'Explore',
    href: '/products?sort=newest',
    accent: 'bg-gradient-to-r from-violet-500 to-purple-600',
    gradient: 'bg-gradient-to-br from-violet-700 via-fuchsia-700 to-pink-700',
    pattern: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.06) 0%, transparent 50%)',
  },
  {
    id: 'fb-3',
    image: HERO_STOCK_IMAGES[2],
    title: 'Top Electronics',
    subtitle: 'Latest gadgets, phones & accessories at unbeatable prices.',
    badge: 'TRENDING',
    cta: 'Browse Electronics',
    href: '/products?category=electronics',
    accent: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    gradient: 'bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900',
    pattern: 'radial-gradient(circle at 70% 30%, rgba(59,130,246,0.15) 0%, transparent 50%)',
  },
  {
    id: 'fb-4',
    image: HERO_STOCK_IMAGES[3],
    title: 'Sell on Xelnova',
    subtitle: 'Join thousands of sellers. Free logistics, secure payments & 50L+ customers.',
    badge: 'START SELLING',
    cta: 'Register Now',
    href: 'https://seller.xelnova.in/',
    accent: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    gradient: 'bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800',
    pattern: 'radial-gradient(circle at 30% 70%, rgba(16,185,129,0.12) 0%, transparent 50%)',
  },
];

const accentColors = [
  'bg-gradient-to-r from-rose-500 to-orange-500',
  'bg-gradient-to-r from-violet-500 to-purple-600',
  'bg-gradient-to-r from-blue-500 to-cyan-500',
  'bg-gradient-to-r from-emerald-500 to-teal-500',
];

function mapBannerToSlide(banner: Banner, index: number): Slide {
  const image = isBigFestiveSaleTitle(banner.title)
    ? BIG_FESTIVE_SALE_BANNER_IMAGE
    : resolveBannerImage(banner.image, index);
  return {
    id: banner.id,
    image,
    title: banner.title,
    subtitle: banner.subtitle || '',
    badge: banner.ctaText || undefined,
    cta: banner.ctaText || 'Shop Now',
    href: banner.ctaLink || '/products',
    accent: accentColors[index % accentColors.length],
    gradient: fallbackSlides[index % fallbackSlides.length].gradient,
  };
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 1.05,
  }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.95,
  }),
};

export function HeroCarousel() {
  const [[page, direction], setPage] = useState([0, 0]);
  const [slides, setSlides] = useState<Slide[]>(fallbackSlides);

  useEffect(() => {
    productsApi.getBanners('hero')
      .then((banners) => {
        const active = banners.filter((b) => b.isActive);
        if (active.length > 0) {
          setSlides(active.sort((a, b) => a.sortOrder - b.sortOrder).map(mapBannerToSlide));
        }
      })
      .catch(() => {});
  }, []);

  const activeIndex = ((page % slides.length) + slides.length) % slides.length;

  const paginate = useCallback(
    (newDirection: number) => setPage([page + newDirection, newDirection]),
    [page]
  );

  useEffect(() => {
    const timer = setInterval(() => paginate(1), 6000);
    return () => clearInterval(timer);
  }, [paginate]);

  const slide = slides[activeIndex];
  const [heroImgError, setHeroImgError] = useState(false);

  useEffect(() => {
    setHeroImgError(false);
  }, [slide.id, slide.image]);

  const showPhoto = Boolean(slide.image) && !heroImgError;

  return (
    <div className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-surface-dark shadow-2xl shadow-black/25 ring-1 ring-white/5 transition-shadow duration-500 hover:shadow-[0_32px_64px_-16px_rgba(124,58,237,0.35)] lg:rounded-3xl">
      <div className="relative h-full min-h-[260px] sm:min-h-[320px] md:min-h-[380px]">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={page}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 180, damping: 28 },
              opacity: { duration: 0.4 },
              scale: { duration: 0.5 },
            }}
            className="absolute inset-0"
          >
            {showPhoto ? (
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 1100px"
                onError={() => setHeroImgError(true)}
              />
            ) : (
              <div className={`absolute inset-0 ${slide.gradient}`} />
            )}

            {/* Multi-layer gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            {/* Decorative pattern overlay */}
            {slide.pattern && (
              <div className="absolute inset-0" style={{ background: slide.pattern }} />
            )}

            {/* Animated decorative elements */}
            <div className="absolute top-8 right-8 hidden lg:block">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                className="w-64 h-64 border border-white/[0.06] rounded-full"
              />
            </div>
            <div className="absolute -bottom-16 -right-16 hidden lg:block">
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                className="w-80 h-80 border border-white/[0.04] rounded-full"
              />
            </div>

            <div className="absolute inset-0 flex items-center">
              <div className="w-full px-6 md:px-10 lg:px-14">
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="max-w-lg"
                >
                  {slide.badge && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className={`inline-flex items-center gap-1.5 text-white text-[10px] font-bold uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-full mb-4 ${slide.accent} shadow-lg`}
                    >
                      <Sparkles size={10} />
                      {slide.badge}
                    </motion.span>
                  )}
                  <h2
                    className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-[1.1] font-display whitespace-pre-line drop-shadow-lg"
                    style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}
                  >
                    {slide.title}
                  </h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="text-sm sm:text-base text-white/80 mb-8 leading-relaxed max-w-md"
                  >
                    {slide.subtitle}
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                  >
                    {isAbsoluteHttpUrl(slide.href) ? (
                      <a
                        href={slide.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 bg-white text-gray-900 px-6 py-3 sm:px-7 sm:py-3.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all duration-200 shadow-2xl shadow-black/20 active:scale-[0.97] group/btn"
                      >
                        {slide.cta}
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-200" />
                      </a>
                    ) : (
                      <Link
                        href={slide.href}
                        className="inline-flex items-center gap-2.5 bg-white text-gray-900 px-6 py-3 sm:px-7 sm:py-3.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all duration-200 shadow-2xl shadow-black/20 active:scale-[0.97] group/btn"
                      >
                        {slide.cta}
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-200" />
                      </Link>
                    )}
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={() => paginate(-1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 active:scale-90"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => paginate(1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 active:scale-90"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Progress bar indicators */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setPage([i, i > activeIndex ? 1 : -1])}
              className="relative h-1.5 rounded-full overflow-hidden transition-all duration-500 bg-white/20"
              style={{ width: i === activeIndex ? 32 : 10 }}
            >
              {i === activeIndex && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-white"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 6, ease: 'linear' }}
                  style={{ transformOrigin: 'left' }}
                />
              )}
              {i !== activeIndex && (
                <div className="absolute inset-0 rounded-full bg-white/40" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
