'use client';

import { useState, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingCart, Star, Truck, ChevronRight, Sparkles } from 'lucide-react';
import { cn, formatCurrency, priceInclusiveOfGst } from '@xelnova/utils';
import type { Product } from '@/lib/data/products';
import { useCartStore } from '@/lib/store/cart-store';
import { useWishlistStore } from '@/lib/store/wishlist-store';
import { useFreeShippingMin } from '@/lib/api';

interface StoreProductCardEnhancedProps {
  product: Product;
  index?: number;
}

const VARIANT_LABELS: Record<string, string> = {
  color: 'Colours',
  colour: 'Colours',
  size: 'Sizes',
  pattern: 'Patterns',
  material: 'Materials',
  style: 'Styles',
  flavor: 'Flavours',
  flavour: 'Flavours',
  scent: 'Scents',
  storage: 'Storage',
  ram: 'RAM Options',
  capacity: 'Capacities',
};

function getVariantSummary(variants: Product['variants'] | undefined) {
  if (!Array.isArray(variants) || variants.length === 0) return [];
  
  return variants
    .slice(0, 3)
    .map((axis) => {
      const options = Array.isArray(axis?.options)
        ? axis.options.filter((o) => o?.available !== false && o?.value)
        : [];
      if (options.length === 0) return null;
      
      const key = (axis.type || '').toLowerCase().trim();
      const label = VARIANT_LABELS[key] || ((axis.label || axis.type || 'Options').trim());
      return { label, count: options.length };
    })
    .filter(Boolean);
}

function getVariantImages(variants: Product['variants'] | undefined): string[] {
  if (!Array.isArray(variants) || variants.length === 0) return [];
  const images: string[] = [];
  for (const axis of variants) {
    const options = Array.isArray(axis?.options) ? axis.options : [];
    for (const option of options) {
      if (option?.available !== false && Array.isArray(option?.images)) {
        for (const img of option.images) {
          if (img && !images.includes(img)) {
            images.push(img);
          }
        }
      }
    }
  }
  return images;
}

export const StoreProductCardEnhanced = memo(function StoreProductCardEnhanced({ 
  product, 
  index = 0 
}: StoreProductCardEnhancedProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const toggle = useWishlistStore((s) => s.toggle);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist(product.id));

  const isBestseller = product.rating >= 4.7 && product.reviewCount >= 1000;
  const isTopRated = product.rating >= 4.5;
  const priceIncl = priceInclusiveOfGst(product.price, product.gstRate);
  const compareIncl = priceInclusiveOfGst(product.comparePrice, product.gstRate);
  const variantSummary = getVariantSummary(product.variants);
  const variantImages = getVariantImages(product.variants);
  const hasVariants = variantImages.length > 0;
  // Driven by admin → Settings → Shipping → "Free Shipping Min (₹)".
  // 0 = free delivery on every order, so the badge shows on every product.
  const freeShippingMin = useFreeShippingMin();
  const qualifiesForFreeDelivery =
    freeShippingMin <= 0 || product.price >= freeShippingMin;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: `${product.id}-default`,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      comparePrice: product.comparePrice,
      image: product.images[0] || '',
      seller: product.seller.name,
      gstRate: product.gstRate ?? null,
    });
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(product.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="group h-full"
      onMouseEnter={() => hasVariants && setShowVariants(true)}
      onMouseLeave={() => setShowVariants(false)}
    >
      <Link href={`/products/${product.slug}`} className="block h-full">
        <div className="relative h-full flex flex-col overflow-hidden rounded-2xl border border-white/80 bg-white shadow-lg hover:shadow-2xl transition-all duration-300 ring-1 ring-primary-100/30 hover:ring-primary-200/50">
          
          {/* Image Container */}
          <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-surface-raised via-white to-primary-50/30">
            {!imgLoaded && !imgError && <div className="absolute inset-0 animate-shimmer" />}
            
            {!imgError && product.images[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                priority={index < 4}
                loading={index < 4 ? 'eager' : 'lazy'}
                className={cn(
                  'object-cover transition-transform duration-500',
                  imgLoaded ? 'opacity-100' : 'opacity-0',
                  !showVariants && 'group-hover:scale-110'
                )}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <ShoppingCart size={32} className="text-gray-300 mb-2" />
                <span className="text-[10px] text-text-muted">No image</span>
              </div>
            )}

            {/* Top Badges */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
              {product.discount > 0 && (
                <motion.span
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl shadow-red-500/30 animate-pulse"
                >
                  <span className="text-lg">🔥</span> {product.discount}% OFF
                </motion.span>
              )}
              {isBestseller && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30">
                  🏆 Bestseller
                </span>
              )}
              {isTopRated && !isBestseller && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30">
                  ✨ Top Rated
                </span>
              )}
            </div>

            {/* Variant indicator badge (always visible) */}
            {hasVariants && variantSummary.length > 0 && !showVariants && (
              <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/95 backdrop-blur-sm border border-gray-200 shadow-sm">
                <div className="flex -space-x-1.5">
                  {variantImages.slice(0, 3).map((img, idx) => (
                    <div
                      key={idx}
                      className="relative w-5 h-5 rounded-full border-2 border-white overflow-hidden shadow-sm"
                    >
                      <Image src={img} alt="" fill sizes="20px" className="object-cover" />
                    </div>
                  ))}
                </div>
                <span className="text-[10px] font-bold text-gray-700">
                  {variantSummary[0]?.count} {variantSummary[0]?.label}
                </span>
              </div>
            )}

            {/* Wishlist Button */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleToggleWishlist}
              className={cn(
                'absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center z-10 transition-all duration-200 shadow-md',
                isInWishlist
                  ? 'bg-red-50 text-red-500 shadow-lg shadow-red-500/30'
                  : 'bg-white/95 text-gray-400 hover:text-red-500 hover:bg-white opacity-0 group-hover:opacity-100 backdrop-blur-sm'
              )}
            >
              <Heart className="w-4 h-4" fill={isInWishlist ? 'currentColor' : 'none'} />
            </motion.button>

            {/* Variant Images Overlay */}
            <AnimatePresence>
              {showVariants && hasVariants && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end justify-start p-4"
                >
                  <div className="flex flex-wrap gap-2">
                    {variantImages.slice(0, 6).map((img, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform"
                      >
                        <Image
                          src={img}
                          alt={`Variant ${idx + 1}`}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </motion.div>
                    ))}
                    {variantImages.length > 6 && (
                      <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm border-2 border-white flex items-center justify-center text-xs font-bold text-white">
                        +{variantImages.length - 6}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Add to Cart */}
            {product.inStock && (
              <div className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]">
                <button
                  onClick={handleAddToCart}
                  className="btn-premium flex-1 rounded-xl py-2.5 text-xs font-bold text-white active:scale-[0.97] flex items-center justify-center gap-1.5"
                >
                  <ShoppingCart size={14} />
                  Quick Add
                </button>
              </div>
            )}

            {!product.inStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-[2px]">
                <span className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-red-600 border border-red-200 shadow-sm">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="p-4 flex-grow flex flex-col gap-2.5">
            {/* Brand */}
            {product.brand && (
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.12em]">
                {product.brand}
              </p>
            )}

            {/* Title */}
            <h3 className="text-sm font-bold text-text-primary line-clamp-2 leading-snug group-hover:text-primary-700 transition-colors min-h-[2.5rem]">
              {product.name}
            </h3>

            {/* Rating */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-0.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm">
                <Star className="w-3 h-3 fill-accent-300 text-accent-300" />
                <span>{product.rating.toFixed(1)}</span>
              </div>
              <span className="text-[11px] text-text-muted font-medium">
                ({product.reviewCount.toLocaleString('en-IN')})
              </span>
            </div>

            {/* Variant Badges */}
            {variantSummary.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5 pt-1.5 border-t border-border/40">
                {variantSummary.map((v, i) => v && (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 hover:from-purple-100 hover:to-pink-100 transition-colors cursor-default"
                    title={`${v.count} ${v.label} available`}
                  >
                    <Sparkles size={11} className="text-purple-600 flex-shrink-0" />
                    <span className="text-[11px] font-semibold text-purple-700">
                      {v.count} {v.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Price */}
            <div className="mt-auto pt-2.5 border-t border-border/40">
              <div className="flex items-baseline gap-2 flex-wrap mb-2">
                <span className="text-lg font-bold text-text-primary">
                  {formatCurrency(priceIncl)}
                </span>
                {compareIncl > priceIncl && (
                  <span className="text-xs text-text-muted line-through">
                    {formatCurrency(compareIncl)}
                  </span>
                )}
              </div>
              
              {qualifiesForFreeDelivery && (
                <p className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg w-fit border border-emerald-100">
                  <Truck className="w-3 h-3 flex-shrink-0" />
                  Free Delivery
                </p>
              )}
            </div>

            {/* View Details CTA */}
            <Link
              href={`/products/${product.slug}`}
              className="mt-3 flex items-center justify-center gap-1.5 w-full rounded-lg bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 py-2 text-xs font-semibold text-primary-700 hover:from-primary-100 hover:to-primary-200 hover:border-primary-300 transition-all duration-300 group/link"
            >
              View Details
              <ChevronRight size={12} className="group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </Link>
    </motion.div>
  );
});
