'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  Star, BadgeCheck, MapPin, Package, Users, Share2, Heart, 
  TrendingUp, ShieldCheck, Clock, Award, Zap, CheckCircle2
} from 'lucide-react';
import type { SellerStore } from '@xelnova/api';
import { cn } from '@xelnova/utils';

interface StoreHeaderProps {
  store: SellerStore;
}

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const stepValue = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue.toLocaleString()}{suffix}</span>;
}

function TrustBadge({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <motion.div
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
        "bg-gradient-to-r backdrop-blur-sm border",
        color
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </motion.div>
  );
}

function StatCard({ icon: Icon, value, label, delay }: { icon: React.ElementType; value: string | number; label: string; delay: number }) {
  return (
    <motion.div
      className="group relative flex flex-col items-center p-4 rounded-2xl bg-surface-muted border border-border hover:border-border hover:bg-surface-muted transition-all duration-300 min-w-[100px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -4 }}
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
        <Icon className="w-5 h-5 text-primary-600" />
      </div>
      <span className="text-xl font-bold text-text-primary">
        {typeof value === 'number' ? <AnimatedCounter value={value} /> : value}
      </span>
      <span className="text-xs text-text-muted mt-0.5">{label}</span>
    </motion.div>
  );
}

export function StoreHeader({ store }: StoreHeaderProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState(store.followers || 0);
  const [shareOpen, setShareOpen] = useState(false);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    setFollowers(f => isFollowing ? f - 1 : f + 1);
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({ title: store.storeName, url: shareUrl });
      } catch {}
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setShareOpen(true);
      setTimeout(() => setShareOpen(false), 2000);
    }
  };

  const themeColor = store.storeThemeColor || '#6366f1';

  return (
    <div className="relative -mt-24 sm:-mt-28 md:-mt-32 pb-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Header Card */}
        <motion.div
          className="relative rounded-3xl overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Glassmorphism background */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/60 to-transparent backdrop-blur-xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-white/90" />
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 0% 0%, ${themeColor}40 0%, transparent 50%),
                               radial-gradient(circle at 100% 100%, ${themeColor}30 0%, transparent 50%)`
            }}
          />
          
          {/* Content */}
          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              {/* Left: Logo & Basic Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {/* Animated Logo */}
                <motion.div 
                  className="relative shrink-0"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                >
                  <div className="relative">
                    {/* Glow effect */}
                    <div 
                      className="absolute -inset-2 rounded-3xl opacity-60 blur-xl"
                      style={{ background: `linear-gradient(135deg, ${themeColor}60, ${themeColor}20)` }}
                    />
                    
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-white shadow-2xl overflow-hidden ring-4 ring-border">
                      {store.logo ? (
                        <Image
                          src={store.logo}
                          alt={store.storeName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center text-4xl sm:text-5xl font-black text-white"
                          style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}88)` }}
                        >
                          {store.storeName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Verified badge */}
                    {store.verified && (
                      <motion.div 
                        className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-4 ring-white"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: 'spring' }}
                      >
                        <BadgeCheck className="w-6 h-6 text-white" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>

                {/* Store Name & Description */}
                <div className="flex-1">
                  <motion.div 
                    className="flex flex-wrap items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h1 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
                      {store.storeName}
                    </h1>
                    
                    {/* Trust badges */}
                    <div className="flex flex-wrap gap-2">
                      {store.verified && (
                        <TrustBadge 
                          icon={ShieldCheck} 
                          label="Verified" 
                          color="from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400"
                        />
                      )}
                      {store.rating >= 4 && (
                        <TrustBadge 
                          icon={Award} 
                          label="Top Rated" 
                          color="from-primary-50 to-primary-100 border-primary-200 text-primary-600"
                        />
                      )}
                      {(store.totalSales || 0) >= 100 && (
                        <TrustBadge 
                          icon={Zap} 
                          label="Power Seller" 
                          color="from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400"
                        />
                      )}
                    </div>
                  </motion.div>

                  {store.description && (
                    <motion.p 
                      className="mt-3 text-text-muted max-w-xl leading-relaxed line-clamp-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      {store.description}
                    </motion.p>
                  )}

                  {/* Rating bar */}
                  <motion.div 
                    className="mt-4 flex items-center gap-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200">
                        <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                        <span className="text-lg font-bold text-primary-600">{store.rating.toFixed(1)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-text-muted">Seller Rating</span>
                        <div className="flex gap-0.5 mt-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star 
                              key={i} 
                              className={cn(
                                "w-3 h-3",
                                i <= Math.round(store.rating) 
                                  ? "fill-amber-400 text-amber-400" 
                                  : "text-text-muted"
                              )} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {store.location && (
                      <div className="flex items-center gap-1.5 text-text-muted">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{store.location}</span>
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex flex-col items-start lg:items-end gap-4 lg:ml-auto">
                {/* Action buttons */}
                <motion.div 
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <motion.button
                    onClick={handleFollow}
                    className={cn(
                      "group relative flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm overflow-hidden transition-all duration-300",
                      isFollowing 
                        ? "bg-surface-muted text-text-primary border border-border" 
                        : "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-400/25 hover:shadow-primary-400/40"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {!isFollowing && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ repeat: Infinity, duration: 1.5, repeatDelay: 3 }}
                      />
                    )}
                    <Heart className={cn("w-4 h-4", isFollowing && "fill-red-500 text-red-500")} />
                    <span>{isFollowing ? 'Following' : 'Follow Store'}</span>
                    {followers > 0 && (
                      <span className={cn(
                        "ml-1 px-2 py-0.5 rounded-full text-xs",
                        isFollowing ? "bg-surface-muted" : "bg-black/10"
                      )}>
                        {followers.toLocaleString()}
                      </span>
                    )}
                  </motion.button>

                  <motion.button
                    onClick={handleShare}
                    className="relative flex items-center gap-2 px-5 py-3 rounded-xl border border-border text-text-muted font-medium text-sm hover:border-primary-300 hover:text-primary-600 transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {shareOpen ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                      </>
                    )}
                  </motion.button>
                </motion.div>

                {/* Quick stats */}
                <motion.div 
                  className="flex items-center gap-4 text-sm text-text-muted"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {store.memberSince && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>Selling since {new Date(store.memberSince).getFullYear()}</span>
                    </div>
                  )}
                  {store.responseTime && (
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span>{store.responseTime}</span>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>

            {/* Stats Row */}
            <motion.div 
              className="mt-8 pt-6 border-t border-border"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
                <StatCard 
                  icon={Package} 
                  value={store.productCount} 
                  label="Products" 
                  delay={0.6}
                />
                {(store.totalSales || 0) > 0 && (
                  <StatCard 
                    icon={TrendingUp} 
                    value={store.totalSales || 0} 
                    label="Orders" 
                    delay={0.7}
                  />
                )}
                {followers > 0 && (
                  <StatCard 
                    icon={Users} 
                    value={followers} 
                    label="Followers" 
                    delay={0.8}
                  />
                )}
                <StatCard 
                  icon={Star} 
                  value={store.rating.toFixed(1)} 
                  label="Rating" 
                  delay={0.9}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
