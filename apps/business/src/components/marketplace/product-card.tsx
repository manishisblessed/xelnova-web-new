'use client';

import { useState, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Star, Truck, Eye } from 'lucide-react';
import { cn, formatCurrency, priceInclusiveOfGst } from '@xelnova/utils';
import type { Product } from '@/lib/data/products';
import { useCartStore } from '@/lib/store/cart-store';
import { useWishlistStore } from '@/lib/store/wishlist-store';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export const ProductCard = memo(function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const toggle = useWishlistStore((s) => s.toggle);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist(product.id));

  const isBestseller = product.rating >= 4.7 && product.reviewCount >= 1000;
  const isTopRated = product.rating >= 4.5;
  const priceIncl = priceInclusiveOfGst(product.price, product.gstRate);
  const compareIncl = priceInclusiveOfGst(product.comparePrice, product.gstRate);

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
    >
      <Link href={`/products/${product.slug}`} className="block h-full">
        <div className="card-3d shine-effect bg-white rounded-2xl border border-white/80 overflow-hidden h-full flex flex-col ring-1 ring-primary-100/30 hover:ring-primary-200/50">
          {/* Image */}
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
                  'object-cover transition-transform duration-500 group-hover:scale-105',
                  imgLoaded ? 'opacity-100' : 'opacity-0'
                )}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center mb-1">
                  <ShoppingCart size={24} className="text-gray-300" />
                </div>
                <span className="text-[10px] text-text-muted">No image</span>
              </div>
            )}

            {/* Top badges */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
              {product.discount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/30 animate-bounce-subtle">
                  <span className="text-accent-300">⚡</span> {product.discount}% OFF
                </span>
              )}
              {isBestseller && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-lg shadow-accent-500/30">
                  🏆 Bestseller
                </span>
              )}
            </div>

            {/* Wishlist */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleToggleWishlist}
              className={cn(
                'absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-200 shadow-sm',
                isInWishlist
                  ? 'bg-red-50 text-red-500'
                  : 'bg-white/90 text-gray-400 hover:text-red-500 hover:bg-white opacity-0 group-hover:opacity-100'
              )}
            >
              <Heart className="w-3.5 h-3.5" fill={isInWishlist ? 'currentColor' : 'none'} />
            </motion.button>

            {/* Quick actions on hover */}
            {product.inStock && (
              <div className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]">
                <button
                  onClick={handleAddToCart}
                  className="btn-premium flex-1 rounded-xl py-2.5 text-xs font-bold text-white active:scale-[0.97]"
                >
                  <span className="relative z-10 flex items-center justify-center gap-1.5">
                    <ShoppingCart size={14} />
                    Add to Cart
                  </span>
                </button>
              </div>
            )}

            {!product.inStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
                <span className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-text-muted border border-border shadow-sm">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-3.5 flex-grow flex flex-col gap-1">
            {product.brand && (
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.1em]">
                {product.brand}
              </p>
            )}

            <h3 className="text-sm font-medium text-text-primary line-clamp-2 leading-snug group-hover:text-primary-700 transition-colors min-h-[2.5rem]">
              {product.name}
            </h3>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm">
                <Star className="w-3 h-3 fill-accent-300 text-accent-300" />
                <span>{product.rating.toFixed(1)}</span>
              </div>
              <span className="text-[11px] text-text-muted">
                ({product.reviewCount.toLocaleString('en-IN')})
              </span>
              {isTopRated && !isBestseller && (
                <span className="text-[10px] text-primary-600 font-semibold bg-primary-50 px-1.5 py-0.5 rounded-md">✨ Top Rated</span>
              )}
            </div>

            <div className="mt-auto pt-1.5">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-base font-bold text-text-primary">
                  {formatCurrency(priceIncl)}
                </span>
                {compareIncl > priceIncl && (
                  <span className="text-xs text-text-muted line-through">
                    {formatCurrency(compareIncl)}
                  </span>
                )}
              </div>
              {product.price >= 499 && (
                <p className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium mt-1.5 bg-emerald-50 px-2 py-1 rounded-lg w-fit">
                  <Truck className="w-3 h-3" />
                  Free delivery
                </p>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
});
