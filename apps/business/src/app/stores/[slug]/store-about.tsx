'use client';

import Image from 'next/image';
import { Star, BadgeCheck, MapPin, Calendar, Package, Users, Award, ShieldCheck } from 'lucide-react';
import type { SellerStore } from '@xelnova/api';

interface StoreAboutProps {
  store: SellerStore;
}

export function StoreAbout({ store }: StoreAboutProps) {
  const memberSince = new Date(store.createdAt).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-4xl">
      <h2 className="mb-8 text-2xl font-bold text-text-primary">
        About {store.storeName}
      </h2>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* About Section */}
          <div className="rounded-2xl border border-border bg-surface-muted p-6">
            <h3 className="mb-4 text-lg font-semibold text-text-primary">
              {store.aboutTitle || 'Our Story'}
            </h3>
            {store.aboutDescription ? (
              <div 
                className="prose prose-sm max-w-none text-text-muted"
                dangerouslySetInnerHTML={{ __html: store.aboutDescription }}
              />
            ) : store.description ? (
              <p className="text-text-muted leading-relaxed">{store.description}</p>
            ) : (
              <p className="text-text-muted italic">
                Welcome to {store.storeName}! We&apos;re committed to providing quality products 
                and excellent customer service. Browse our collection and discover amazing deals.
              </p>
            )}
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <TrustBadge
              icon={ShieldCheck}
              title="Secure Payments"
              subtitle="100% Protected"
            />
            <TrustBadge
              icon={Package}
              title="Fast Delivery"
              subtitle="Quick Shipping"
            />
            <TrustBadge
              icon={Award}
              title="Quality Products"
              subtitle="Curated Selection"
            />
            <TrustBadge
              icon={Users}
              title="24/7 Support"
              subtitle="Always Available"
            />
          </div>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          {/* Store Card */}
          <div className="rounded-2xl border border-border bg-surface-muted p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                {store.logo ? (
                  <Image
                    src={store.logo}
                    alt={store.storeName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                    style={{ backgroundColor: store.storeThemeColor || '#7c3aed' }}
                  >
                    {store.storeName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-text-primary">{store.storeName}</h4>
                {store.verified && (
                  <span className="inline-flex items-center gap-1 text-xs text-blue-400">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Verified Seller
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* Rating */}
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Seller Rating</span>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-text-primary">{store.rating.toFixed(1)}</span>
                  <span className="text-text-muted">/ 5</span>
                </div>
              </div>

              {/* Products */}
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Products</span>
                <span className="font-semibold text-text-primary">{store.productCount}</span>
              </div>

              {/* Total Sales */}
              {store.totalSales > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Orders Fulfilled</span>
                  <span className="font-semibold text-text-primary">{store.totalSales.toLocaleString()}</span>
                </div>
              )}

              {/* Location */}
              {store.location && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Location</span>
                  <span className="flex items-center gap-1 text-text-primary">
                    <MapPin className="w-3.5 h-3.5 text-text-muted" />
                    {store.location}
                  </span>
                </div>
              )}

              {/* Member Since */}
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Selling Since</span>
                <span className="flex items-center gap-1 text-text-primary">
                  <Calendar className="w-3.5 h-3.5 text-text-muted" />
                  {memberSince}
                </span>
              </div>
            </div>
          </div>

          {/* Categories */}
          {store.categories.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface-muted p-6">
              <h4 className="mb-4 font-semibold text-text-primary">Categories</h4>
              <div className="flex flex-wrap gap-2">
                {store.categories.map((cat) => (
                  <span
                    key={cat.id}
                    className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-medium text-text-primary"
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrustBadge({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center text-center rounded-xl border border-border bg-surface-muted p-4">
      <div className="mb-2 rounded-full bg-primary-50 p-3">
        <Icon className="w-5 h-5 text-primary-600" />
      </div>
      <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
      <p className="text-xs text-text-muted">{subtitle}</p>
    </div>
  );
}
