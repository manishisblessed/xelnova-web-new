'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Sparkles, Flame, Trophy, Package, Loader2 } from 'lucide-react';

type Tab = 'products' | 'categories' | 'deals' | 'about';

interface StorePageProps {
  store: SellerStore;
}

function SectionHeader({ 
  icon: Icon, 
  title, 
  subtitle,
  iconColor = 'text-gold-400'
}: { 
  icon: React.ElementType; 
  title: string; 
  subtitle?: string;
  iconColor?: string;
}) {
  return (
    <motion.div 
      className="mb-8"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">{title}</h2>
          {subtitle && (
            <p className="text-surface-300 text-sm mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function StorePage({ store }: StorePageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [deals, setDeals] = useState<Product[]>([]);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [total, setTotal] = useState(store.productCount || 0);

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-surface-950">
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
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {activeTab === 'products' && (
            <motion.div
              key="products"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20 }}
              className="space-y-16"
            >
              {/* Featured Products */}
              {hasFeaturedProducts && (
                <motion.div variants={itemVariants}>
                  <SectionHeader 
                    icon={Sparkles} 
                    title="Featured Products" 
                    subtitle="Hand-picked products you'll love"
                    iconColor="text-purple-400"
                  />
                  <StoreFeatured 
                    products={store.featuredProducts.map((p: any) => mapProduct(p))}
                    title="Featured Products"
                  />
                </motion.div>
              )}

              {/* Bestsellers */}
              {hasBestsellers && (
                <motion.div variants={itemVariants}>
                  <SectionHeader 
                    icon={Trophy} 
                    title="Best Sellers" 
                    subtitle="Our most popular products"
                    iconColor="text-gold-400"
                  />
                  <StoreFeatured
                    products={bestsellers.map((p: any) => mapProduct(p))}
                    title="Best Sellers"
                  />
                </motion.div>
              )}

              {/* Deals */}
              {hasDeals && (
                <motion.div variants={itemVariants}>
                  <SectionHeader 
                    icon={Flame} 
                    title="Deals & Offers" 
                    subtitle="Limited time savings"
                    iconColor="text-orange-400"
                  />
                  <StoreFeatured 
                    products={deals.map((p: any) => mapProduct(p))}
                    title="Deals & Offers"
                  />
                </motion.div>
              )}

              {/* All Products */}
              <motion.div variants={itemVariants}>
                <SectionHeader 
                  icon={Package} 
                  title="All Products" 
                  subtitle={`Explore ${total.toLocaleString()} products from this store`}
                  iconColor="text-blue-400"
                />
                <StoreProducts slug={store.slug} />
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'categories' && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <StoreCategories categories={store.categories} slug={store.slug} />
            </motion.div>
          )}

          {activeTab === 'deals' && (
            <motion.div
              key="deals"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {loadingDeals ? (
                <div className="flex flex-col items-center justify-center py-32">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-gold-400/20 border-t-gold-400 animate-spin" />
                    <Flame className="absolute inset-0 m-auto w-6 h-6 text-gold-400" />
                  </div>
                  <p className="mt-4 text-surface-300">Loading deals...</p>
                </div>
              ) : deals.length > 0 ? (
                <>
                  <SectionHeader 
                    icon={Flame} 
                    title="All Deals & Offers" 
                    subtitle={`${deals.length} active deals from ${store.storeName}`}
                    iconColor="text-orange-400"
                  />
                  <StoreFeatured 
                    products={deals.map((p: any) => mapProduct(p))}
                    title="All Deals & Offers"
                    showAll
                  />
                </>
              ) : (
                <motion.div 
                  className="flex flex-col items-center justify-center py-32 text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center mb-6">
                    <Tag className="w-12 h-12 text-orange-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">No Active Deals</h3>
                  <p className="text-surface-300 max-w-md">
                    {store.storeName} doesn&apos;t have any deals right now. Check back later for exciting offers!
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <StoreAbout store={store} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative footer gradient */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

// Import Tag for the empty state
import { Tag } from 'lucide-react';
