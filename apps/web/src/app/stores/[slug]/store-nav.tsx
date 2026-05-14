'use client';

import { motion } from 'framer-motion';
import { Package, Grid3X3, Tag, Info, Sparkles } from 'lucide-react';
import { cn } from '@xelnova/utils';

type Tab = 'products' | 'categories' | 'deals' | 'about';

interface StoreNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  hasDeals?: boolean;
}

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'products', label: 'All Products', icon: Package },
  { id: 'categories', label: 'Categories', icon: Grid3X3 },
  { id: 'deals', label: 'Deals', icon: Tag },
  { id: 'about', label: 'About', icon: Info },
];

export function StoreNav({ activeTab, onTabChange, hasDeals }: StoreNavProps) {
  return (
    <div className="sticky top-16 z-30 mt-6">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-y border-border" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-center sm:justify-start gap-1 overflow-x-auto scrollbar-hide py-2">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'relative flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300',
                  isActive 
                    ? 'text-white' 
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-muted'
                )}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: isActive ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Active background */}
                {isActive && (
                  <motion.div
                    layoutId="store-nav-active"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg shadow-primary-400/20"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                
                <span className="relative flex items-center gap-2">
                  <Icon className={cn("w-4 h-4", isActive && "animate-pulse")} />
                  <span>{tab.label}</span>
                </span>
                
                {/* Deals notification badge */}
                {tab.id === 'deals' && hasDeals && (
                  <motion.span 
                    className="relative flex h-2.5 w-2.5"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* Decorative gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-200 to-transparent" />
    </div>
  );
}
