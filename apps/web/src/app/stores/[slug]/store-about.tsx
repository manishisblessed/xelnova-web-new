'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  Star, BadgeCheck, MapPin, Calendar, Package, Users, Award, 
  ShieldCheck, MessageCircle, Truck, RefreshCw, Heart, Info
} from 'lucide-react';
import type { SellerStore } from '@xelnova/api';

interface StoreAboutProps {
  store: SellerStore;
}

export function StoreAbout({ store }: StoreAboutProps) {
  const memberSince = new Date(store.createdAt).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div 
      className="max-w-5xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-muted border border-border mb-4">
          <Info className="w-4 h-4 text-primary-600" />
          <span className="text-sm text-text-muted">About the Seller</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
          {store.storeName}
        </h2>
        <p className="text-text-muted">
          Quality products, exceptional service, happy customers
        </p>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* About Section */}
          <motion.div 
            variants={itemVariants}
            className="relative rounded-3xl overflow-hidden"
          >
            {/* Card background */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/60 to-transparent backdrop-blur-xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-white/90" />
            
            <div className="relative p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-text-primary">
                  {store.aboutTitle || 'Our Story'}
                </h3>
              </div>

              {store.aboutDescription ? (
                <div 
                  className="prose prose-sm max-w-none text-text-muted leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: store.aboutDescription }}
                />
              ) : store.description ? (
                <p className="text-text-muted leading-relaxed text-lg">{store.description}</p>
              ) : (
                <div className="space-y-4 text-text-muted leading-relaxed">
                  <p>
                    Welcome to <span className="text-text-primary font-medium">{store.storeName}</span>! 
                    We&apos;re passionate about delivering quality products that exceed your expectations.
                  </p>
                  <p>
                    Our commitment to excellence drives everything we do - from carefully curating our 
                    product selection to ensuring every order reaches you in perfect condition.
                  </p>
                  <p>
                    Thank you for choosing us. We look forward to serving you!
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Trust Badges */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            <TrustBadge
              icon={ShieldCheck}
              title="Secure Payments"
              subtitle="100% Protected"
              color="from-blue-500/20 to-blue-600/20"
              iconColor="text-blue-400"
              delay={0}
            />
            <TrustBadge
              icon={Truck}
              title="Fast Delivery"
              subtitle="Quick Shipping"
              color="from-green-500/20 to-green-600/20"
              iconColor="text-green-400"
              delay={0.1}
            />
            <TrustBadge
              icon={RefreshCw}
              title="Easy Returns"
              subtitle="Hassle-Free"
              color="from-orange-500/20 to-orange-600/20"
              iconColor="text-orange-400"
              delay={0.2}
            />
            <TrustBadge
              icon={MessageCircle}
              title="24/7 Support"
              subtitle="Always Here"
              color="from-purple-500/20 to-purple-600/20"
              iconColor="text-purple-400"
              delay={0.3}
            />
          </motion.div>

          {/* Stats Cards */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-3 gap-4"
          >
            <StatCard 
              value={store.productCount.toString()} 
              label="Products" 
              icon={Package}
            />
            {store.totalSales > 0 && (
              <StatCard 
                value={store.totalSales.toLocaleString()} 
                label="Orders" 
                icon={Users}
              />
            )}
            <StatCard 
              value={store.rating.toFixed(1)} 
              label="Rating" 
              icon={Star}
            />
          </motion.div>
        </div>

        {/* Sidebar */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Store Card */}
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/60 to-transparent backdrop-blur-xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-white/90" />
            
            <div className="relative p-6">
              <div className="flex items-center gap-4 mb-6">
                <motion.div 
                  className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 ring-4 ring-border"
                  whileHover={{ scale: 1.05 }}
                >
                  {store.logo ? (
                    <Image
                      src={store.logo}
                      alt={store.storeName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center text-3xl font-bold text-white"
                      style={{ backgroundColor: store.storeThemeColor || '#6366f1' }}
                    >
                      {store.storeName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </motion.div>
                <div>
                  <h4 className="text-lg font-bold text-text-primary">{store.storeName}</h4>
                  {store.verified && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-blue-400 mt-1">
                      <BadgeCheck className="w-4 h-4" />
                      Verified Seller
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {/* Rating */}
                <InfoRow 
                  icon={Star}
                  label="Seller Rating"
                  value={
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <Star 
                            key={i} 
                            className={`w-3.5 h-3.5 ${i <= Math.round(store.rating) ? 'fill-amber-400 text-amber-400' : 'text-text-muted'}`} 
                          />
                        ))}
                      </div>
                      <span className="font-bold text-text-primary">{store.rating.toFixed(1)}</span>
                    </div>
                  }
                />

                {/* Products */}
                <InfoRow 
                  icon={Package}
                  label="Products"
                  value={<span className="font-semibold text-text-primary">{store.productCount}</span>}
                />

                {/* Total Sales */}
                {store.totalSales > 0 && (
                  <InfoRow 
                    icon={Users}
                    label="Orders Fulfilled"
                    value={<span className="font-semibold text-text-primary">{store.totalSales.toLocaleString()}</span>}
                  />
                )}

                {/* Location */}
                {store.location && (
                  <InfoRow 
                    icon={MapPin}
                    label="Location"
                    value={<span className="text-text-primary">{store.location}</span>}
                  />
                )}

                {/* Member Since */}
                <InfoRow 
                  icon={Calendar}
                  label="Selling Since"
                  value={<span className="text-text-primary">{memberSince}</span>}
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          {store.categories.length > 0 && (
            <div className="relative rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/60 to-transparent backdrop-blur-xl" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-white/90" />
              
              <div className="relative p-6">
                <h4 className="mb-4 font-bold text-text-primary flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary-600" />
                  Shop by Category
                </h4>
                <div className="flex flex-wrap gap-2">
                  {store.categories.map((cat, index) => (
                    <motion.span
                      key={cat.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      className="rounded-full bg-surface-muted px-4 py-2 text-sm font-medium text-text-primary border border-border cursor-pointer hover:border-primary-200 transition-colors"
                    >
                      {cat.name}
                    </motion.span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

function TrustBadge({
  icon: Icon,
  title,
  subtitle,
  color,
  iconColor,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color: string;
  iconColor: string;
  delay: number;
}) {
  return (
    <motion.div 
      className="group relative flex flex-col items-center text-center rounded-2xl overflow-hidden cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/30 to-transparent backdrop-blur-sm" />
      <div className="absolute inset-0 bg-white/80 border border-border rounded-2xl group-hover:border-border transition-colors" />
      
      <div className="relative p-5">
        <div className={`mb-3 rounded-2xl bg-gradient-to-br ${color} p-3 group-hover:scale-110 transition-transform`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
        <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
      </div>
    </motion.div>
  );
}

function StatCard({ value, label, icon: Icon }: { value: string; label: string; icon: React.ElementType }) {
  return (
    <motion.div 
      className="relative rounded-2xl overflow-hidden"
      whileHover={{ scale: 1.02 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-primary-50 backdrop-blur-sm" />
      <div className="absolute inset-0 bg-white/50 border border-primary-200 rounded-2xl" />
      
      <div className="relative p-4 text-center">
        <Icon className="w-6 h-6 text-primary-600 mx-auto mb-2" />
        <div className="text-2xl font-bold text-text-primary">{value}</div>
        <div className="text-xs text-text-muted">{label}</div>
      </div>
    </motion.div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="flex items-center gap-2 text-text-muted">
        <Icon className="w-4 h-4" />
        {label}
      </span>
      {value}
    </div>
  );
}
