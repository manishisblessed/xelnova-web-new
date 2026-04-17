'use client';

import Image from 'next/image';
import { Star, BadgeCheck, MapPin, Package, Users } from 'lucide-react';
import type { SellerStore } from '@xelnova/api';
import { formatCurrency } from '@xelnova/utils';

interface StoreHeaderProps {
  store: SellerStore;
}

export function StoreHeader({ store }: StoreHeaderProps) {
  return (
    <div className="relative -mt-16 sm:-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
          {/* Logo */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-white shadow-xl border-4 border-white overflow-hidden">
              {store.logo ? (
                <Image
                  src={store.logo}
                  alt={store.storeName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-white"
                  style={{ backgroundColor: store.storeThemeColor || '#7c3aed' }}
                >
                  {store.storeName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {store.verified && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                <BadgeCheck className="w-5 h-5 text-white" />
              </div>
            )}
          </div>

          {/* Store Info */}
          <div className="flex-1 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {store.storeName}
              </h1>
              {store.verified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Verified Seller
                </span>
              )}
            </div>

            {store.description && (
              <p className="mt-2 text-sm text-surface-100 line-clamp-2 max-w-2xl">
                {store.description}
              </p>
            )}

            {/* Stats */}
            <div className="mt-4 flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
              {/* Rating */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gold-400/20">
                  <Star className="w-4 h-4 fill-gold-400 text-gold-400" />
                  <span className="font-semibold text-gold-400">{store.rating.toFixed(1)}</span>
                </div>
                <span className="text-surface-100">Seller Rating</span>
              </div>

              {/* Products */}
              <div className="flex items-center gap-1.5 text-surface-100">
                <Package className="w-4 h-4" />
                <span><strong className="text-white">{store.productCount}</strong> Products</span>
              </div>

              {/* Sales */}
              {store.totalSales > 0 && (
                <div className="flex items-center gap-1.5 text-surface-100">
                  <Users className="w-4 h-4" />
                  <span><strong className="text-white">{store.totalSales.toLocaleString()}</strong> Orders</span>
                </div>
              )}

              {/* Location */}
              {store.location && (
                <div className="flex items-center gap-1.5 text-surface-100">
                  <MapPin className="w-4 h-4" />
                  <span>{store.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pb-2">
            <button className="px-6 py-2.5 rounded-xl bg-gold-400 text-surface-950 font-semibold text-sm hover:bg-gold-300 transition-colors">
              Follow Store
            </button>
            <button className="px-6 py-2.5 rounded-xl border border-surface-300 text-surface-50 font-semibold text-sm hover:border-gold-400/50 hover:text-gold-400 transition-colors">
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
