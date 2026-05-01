'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type { SellerStore } from '@xelnova/api';

interface StoreHeroProps {
  store: SellerStore;
}

function FloatingParticle({ delay, duration, size, left, color }: { delay: number; duration: number; size: number; left: string; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left,
        background: color,
        filter: 'blur(1px)',
      }}
      initial={{ y: '100%', opacity: 0, scale: 0 }}
      animate={{
        y: '-100%',
        opacity: [0, 1, 1, 0],
        scale: [0, 1, 1, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

function AnimatedGradientOrbs() {
  return (
    <>
      <motion.div
        className="absolute w-96 h-96 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)' }}
        animate={{
          x: [0, 100, 50, 0],
          y: [0, -50, 50, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-0 bottom-0 w-80 h-80 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }}
        animate={{
          x: [0, -80, -40, 0],
          y: [0, 60, -30, 0],
          scale: [1, 0.8, 1.1, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-1/3 top-1/4 w-64 h-64 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)' }}
        animate={{
          x: [0, 60, -40, 0],
          y: [0, -40, 40, 0],
          scale: [1, 1.3, 0.8, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
    </>
  );
}

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

  const themeColor = store.storeThemeColor || '#6366f1';
  
  const particles = useMemo(() => 
    Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      delay: Math.random() * 5,
      duration: 8 + Math.random() * 6,
      size: 2 + Math.random() * 4,
      left: `${Math.random() * 100}%`,
      color: i % 3 === 0 ? 'rgba(255,215,0,0.6)' : i % 3 === 1 ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.4)',
    })), []
  );

  if (!hasBanners) {
    return (
      <div className="relative h-64 sm:h-80 md:h-[420px] overflow-hidden">
        {/* Dynamic gradient background */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 30%, ${themeColor}aa 60%, ${themeColor}77 100%)`,
          }}
          animate={{
            background: [
              `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 30%, ${themeColor}aa 60%, ${themeColor}77 100%)`,
              `linear-gradient(180deg, ${themeColor} 0%, ${themeColor}cc 40%, ${themeColor}99 70%, ${themeColor}66 100%)`,
              `linear-gradient(225deg, ${themeColor} 0%, ${themeColor}dd 30%, ${themeColor}aa 60%, ${themeColor}77 100%)`,
              `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 30%, ${themeColor}aa 60%, ${themeColor}77 100%)`,
            ],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Animated background orbs */}
        <AnimatedGradientOrbs />

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden">
          {particles.map((p) => (
            <FloatingParticle key={p.id} {...p} />
          ))}
        </div>

        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `radial-gradient(at 40% 20%, rgba(255,255,255,0.15) 0px, transparent 50%),
                           radial-gradient(at 80% 0%, rgba(255,255,255,0.1) 0px, transparent 40%),
                           radial-gradient(at 0% 50%, rgba(255,255,255,0.08) 0px, transparent 50%),
                           radial-gradient(at 80% 50%, rgba(255,255,255,0.1) 0px, transparent 40%),
                           radial-gradient(at 0% 100%, rgba(255,255,255,0.05) 0px, transparent 50%)`
        }} />

        {/* Store name with logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div 
            className="text-center z-10"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {store.logo && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <Image
                  src={store.logo}
                  alt={store.storeName}
                  width={100}
                  height={100}
                  className="mx-auto mb-4 rounded-2xl shadow-2xl ring-4 ring-white/20"
                />
              </motion.div>
            )}
            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight"
              style={{ textShadow: '0 4px 30px rgba(0,0,0,0.3)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {store.storeName}
            </motion.h1>
            <motion.div
              className="mt-4 flex items-center justify-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-white/80 text-sm font-medium">Official Store</span>
              <Sparkles className="w-4 h-4 text-yellow-300" />
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-surface-950 via-surface-950/80 to-transparent" />
        
        {/* Animated wave effect */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 100" preserveAspectRatio="none">
          <motion.path
            fill="rgb(9, 9, 11)"
            fillOpacity="1"
            d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,100 L0,100 Z"
            animate={{
              d: [
                "M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,100 L0,100 Z",
                "M0,60 C360,20 720,80 1080,40 C1260,20 1380,60 1440,50 L1440,100 L0,100 Z",
                "M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,100 L0,100 Z",
              ],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="group relative h-64 sm:h-80 md:h-[420px] lg:h-[480px] overflow-hidden">
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
            <div 
              className="h-full w-full"
              style={{ background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}88 100%)` }}
            />
          )}
          
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/40 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.slice(0, 10).map((p) => (
          <FloatingParticle key={p.id} {...p} />
        ))}
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <motion.button
            onClick={() => paginate(-1)}
            className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-xl border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft className="w-6 h-6" />
          </motion.button>
          <motion.button
            onClick={() => paginate(1)}
            className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-xl border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronRight className="w-6 h-6" />
          </motion.button>

          {/* Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-full bg-black/20 backdrop-blur-md">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setPage([i, i > activeIndex ? 1 : -1])}
                className={`h-2 rounded-full transition-all duration-500 ${
                  i === activeIndex ? 'w-8 bg-white shadow-glow' : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Bottom wave */}
      <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 60" preserveAspectRatio="none">
        <path
          fill="rgb(9, 9, 11)"
          d="M0,30 Q360,60 720,30 T1440,30 L1440,60 L0,60 Z"
        />
      </svg>
    </div>
  );
}
