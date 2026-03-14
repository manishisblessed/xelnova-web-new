'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

interface Slide {
  id: number;
  image: string;
  title: string;
  subtitle: string;
  badge?: string;
  cta: string;
  href: string;
  accent: string;
}

const slides: Slide[] = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=1400&h=600&fit=crop',
    title: 'Electronics\nMega Sale',
    subtitle: 'Up to 70% off on smartphones, laptops & accessories',
    badge: 'Limited Time',
    cta: 'Shop Electronics',
    href: '/products?category=electronics',
    accent: 'bg-primary-500',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1400&h=600&fit=crop',
    title: 'New Season\nFashion',
    subtitle: 'Trending styles at unbeatable prices — refresh your wardrobe',
    badge: 'Trending Now',
    cta: 'Explore Fashion',
    href: '/products?category=fashion',
    accent: 'bg-accent-500',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=1400&h=600&fit=crop',
    title: 'Home &\nLiving Fest',
    subtitle: 'Transform your space with curated furniture & decor',
    badge: 'Best Sellers',
    cta: 'Discover More',
    href: '/products?category=home-furniture',
    accent: 'bg-primary-500',
  },
];

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0, scale: 0.98 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 300 : -300, opacity: 0, scale: 0.98 }),
};

export function HeroCarousel() {
  const [[page, direction], setPage] = useState([0, 0]);
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

  return (
    <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-surface-dark group shadow-lg shadow-black/10 h-full">
      <div className="relative h-full min-h-[220px] sm:min-h-[280px] md:min-h-[340px]">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={page}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 200, damping: 25 },
              opacity: { duration: 0.3 },
              scale: { duration: 0.4 },
            }}
            className="absolute inset-0"
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1100px"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />

            <div className="absolute inset-0 flex items-center">
              <div className="w-full px-6 md:px-10 lg:px-14">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="max-w-md"
                >
                  {slide.badge && (
                    <span className={`inline-block text-white text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full mb-3 ${slide.accent}`}>
                      {slide.badge}
                    </span>
                  )}
                  <h2 className="text-2xl sm:text-3xl lg:text-[2.75rem] font-extrabold text-white mb-3 leading-[1.1] font-display whitespace-pre-line">
                    {slide.title}
                  </h2>
                  <p className="text-sm sm:text-base text-white/65 mb-6 leading-relaxed max-w-sm">
                    {slide.subtitle}
                  </p>
                  <Link
                    href={slide.href}
                    className="inline-flex items-center gap-2 bg-white text-text-primary px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-semibold text-sm hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 shadow-xl shadow-black/15 active:scale-[0.97] group/btn"
                  >
                    {slide.cta}
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={() => paginate(-1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 active:scale-90"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => paginate(1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 active:scale-90"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setPage([i, i > activeIndex ? 1 : -1])}
              className="relative h-1.5 rounded-full overflow-hidden transition-all duration-500"
              style={{ width: i === activeIndex ? 28 : 8 }}
            >
              <div className={`absolute inset-0 rounded-full transition-colors duration-300 ${
                i === activeIndex ? 'bg-white' : 'bg-white/35'
              }`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
