'use client';

import { useState, useEffect } from 'react';
import { storesApi } from '@xelnova/api';
import type { SellerStore, Product } from '@xelnova/api';
import { StoreHero } from './store-hero';
import { StoreHeader } from './store-header';
import { StoreNav } from './store-nav';
import { StoreProducts } from './store-products';
import { StoreCategories } from './store-categories';
import { StoreAbout } from './store-about';
import { StoreFeatured } from './store-featured';
import { StoreJsonLd } from './store-jsonld';
import { mapProduct } from '@/lib/api';

type Tab = 'products' | 'categories' | 'deals' | 'about';

interface StorePageProps {
  store: SellerStore;
}

export function StorePage({ store }: StorePageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [deals, setDeals] = useState<Product[]>([]);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(true);

  useEffect(() => {
    Promise.all([
      storesApi.getStoreDeals(store.slug, 20),
      storesApi.getStoreBestsellers(store.slug, 10),
    ])
      .then(([dealsData, bestsellersData]) => {
        setDeals(dealsData);
        setBestsellers(bestsellersData);
      })
      .finally(() => setLoadingDeals(false));
  }, [store.slug]);

  const hasFeaturedProducts = store.featuredProducts && store.featuredProducts.length > 0;
  const hasDeals = deals.length > 0;
  const hasBestsellers = bestsellers.length > 0;

  return (
    <div className="min-h-screen bg-surface-raised">
      <StoreJsonLd store={store} />
      
      {/* Hero Banner */}
      <StoreHero store={store} />

      {/* Store Header */}
      <StoreHeader store={store} />

      {/* Navigation */}
      <StoreNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        hasDeals={hasDeals}
      />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'products' && (
          <div className="space-y-12">
            {/* Featured Products */}
            {hasFeaturedProducts && (
              <StoreFeatured 
                products={store.featuredProducts.map((p: any) => mapProduct(p))} 
                title="Featured Products"
              />
            )}

            {/* Bestsellers */}
            {hasBestsellers && (
              <StoreFeatured 
                products={bestsellers.map((p: any) => mapProduct(p))} 
                title="Best Sellers"
              />
            )}

            {/* Deals */}
            {hasDeals && (
              <StoreFeatured 
                products={deals.map((p: any) => mapProduct(p))} 
                title="Deals & Offers"
              />
            )}

            {/* All Products */}
            <StoreProducts slug={store.slug} />
          </div>
        )}

        {activeTab === 'categories' && (
          <StoreCategories categories={store.categories} slug={store.slug} />
        )}

        {activeTab === 'deals' && (
          <div>
            {loadingDeals ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-400 border-t-transparent" />
              </div>
            ) : deals.length > 0 ? (
              <StoreFeatured 
                products={deals.map((p: any) => mapProduct(p))} 
                title="All Deals & Offers"
                showAll
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 text-4xl">🏷️</div>
                <h3 className="text-lg font-semibold text-text-primary">No active deals</h3>
                <p className="mt-1 text-sm text-text-muted">
                  Check back later for exciting offers from {store.storeName}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <StoreAbout store={store} />
        )}
      </div>
    </div>
  );
}
