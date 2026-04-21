'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SellerStore } from '@xelnova/api';

interface StoreHeroProps {
  store: SellerStore;
}

const DEFAULT_GRADIENT = 'bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900';

export function StoreHero({ store }: StoreHeroProps) {
  const [[page, direction], setPage] = useState([0, 0]);
  const [imgError, setImgError] = useState(false);

  const banners = store.storeBanners?.length > 0 
    ? store.storeBanners 
    : store.heroBannerUrl 
      ? [{ id: 'hero', imageUrl: store.heroBannerUrl, mobileUrl: store.heroBannerMobile, title: null, link: null }]
      : [];

  const hasBanners = banners.length > 0;
  const activeIndex = hasBanners ? ((page % banners.length) + banners.length) % banners.length : 0;
  const currentBanner = banners[activeIndex];

  const paginate = useCallback(
    (newDirection: number) => setPage([page + newDirection, newDirection]),
    [page]
  );

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => paginate(1), 6000);
    return () => clearInterval(timer);
  }, [paginate, banners.length]);

  useEffect(() => {
    setImgError(false);
  }, [currentBanner?.imageUrl]);

  const themeColor = store.storeThemeColor || '#0c831f';

  if (!hasBanners) {
    return (
      <div 
        className="relative h-48 sm:h-64 md:h-80 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}cc 50%, ${themeColor}99 100%)` }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            {store.logo && (
              <Image
                src={store.logo}
                alt={store.storeName}
                width={120}
                height={120}
                className="mx-auto mb-4 rounded-2xl shadow-xl"
              />
            )}
            <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">
              {store.storeName}
            </h1>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-surface-950/60 to-transparent" />
      </div>
    );
  }

  return (
    <div className="group relative h-48 sm:h-64 md:h-80 lg:h-96 overflow-hidden">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={page}
          custom={direction}
          initial={{ x: direction > 0 ? '100%' : '-100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction < 0 ? '100%' : '-100%', opacity: 0 }}
          transition={{ x: { type: 'spring', stiffness: 180, damping: 28 }, opacity: { duration: 0.3 } }}
          className="absolute inset-0"
        >
          {currentBanner?.imageUrl && !imgError ? (
            <>
              <Image
                src={currentBanner.imageUrl}
                alt={currentBanner.title || store.storeName}
                fill
                priority
                className="object-cover hidden sm:block"
                onError={() => setImgError(true)}
              />
              <Image
                src={currentBanner.mobileUrl || currentBanner.imageUrl}
                alt={currentBanner.title || store.storeName}
                fill
                priority
                className="object-cover sm:hidden"
                onError={() => setImgError(true)}
              />
            </>
          ) : (
            <div className={DEFAULT_GRADIENT + ' h-full w-full'} />
          )}
          
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-950/60 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => paginate(-1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => paginate(1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setPage([i, i > activeIndex ? 1 : -1])}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIndex ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
