'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import type { Product } from '@/lib/data/products';

function useCountdown(endAt: string) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0, expired: false });

  useEffect(() => {
    function calc() {
      const end = new Date(endAt).getTime();
      if (isNaN(end)) return { h: 0, m: 0, s: 0, expired: true };
      const diff = end - Date.now();
      if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true };
      return {
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        expired: false,
      };
    }
    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [endAt]);

  return timeLeft;
}

export function FlashDealCard({ product }: { product: Product }) {
  const endAt = useMemo(
    () => product.flashDealEndsAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    [product.flashDealEndsAt],
  );
  const { h, m, s, expired } = useCountdown(endAt);
  const [imgLoaded, setImgLoaded] = useState(false);

  const discount = product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  const claimed = product.stockCount <= 0
    ? 100
    : product.stockCount <= 5
      ? Math.min(95, 80 + (5 - product.stockCount) * 3)
      : product.stockCount <= 20
        ? Math.min(79, 50 + (20 - product.stockCount) * 1.5)
        : Math.max(10, Math.min(49, 50 - Math.floor(product.stockCount / 5)));
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <Link href={`/products/${product.slug}`}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="group flex w-[200px] flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm transition-all hover:shadow-xl hover:shadow-black/[0.06] hover:border-border sm:w-[220px]"
      >
        {/* Deal Badge */}
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-danger-600 to-danger-500 px-3 py-1.5">
          <Zap size={12} className="fill-accent-300 text-accent-300" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wide">Flash Deal</span>
        </div>

        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-surface-raised">
          {!imgLoaded && <div className="absolute inset-0 animate-shimmer" />}
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="220px"
              className={`object-cover transition-transform duration-500 group-hover:scale-110 ${
                imgLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImgLoaded(true)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50">
              <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center mb-1.5">
                <Zap size={24} className="text-primary-300" />
              </div>
              <span className="text-[10px] text-text-muted">No image</span>
            </div>
          )}
          {discount > 0 && (
            <span className="absolute bottom-2 left-2 rounded-md bg-primary-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
              {discount}% OFF
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-2.5 p-3">
          <h4 className="line-clamp-1 text-sm font-medium text-text-primary">{product.name}</h4>

          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-text-primary">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
            {product.comparePrice > product.price && (
              <span className="text-xs text-text-muted line-through">
                ₹{product.comparePrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Countdown */}
          <div className="flex gap-1.5">
            {[
              { label: 'H', val: pad(h) },
              { label: 'M', val: pad(m) },
              { label: 'S', val: pad(s) },
            ].map((t) => (
              <div key={t.label} className="flex flex-col items-center rounded-lg bg-surface-raised px-2.5 py-1.5 border border-border/60">
                <span className="text-sm font-bold text-primary-700 tabular-nums">{expired ? '00' : t.val}</span>
                <span className="text-[8px] text-text-muted">{t.label}</span>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div>
            <div className="mb-0.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-danger-500 to-accent-400"
                style={{ width: `${claimed}%` }}
              />
            </div>
            <p className="text-[10px] text-text-muted">{claimed}% claimed</p>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
