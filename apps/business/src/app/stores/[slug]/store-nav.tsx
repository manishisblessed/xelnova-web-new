'use client';

import { motion } from 'framer-motion';
import { Package, Grid3X3, Tag, Info } from 'lucide-react';
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
    <div className="sticky top-16 z-30 mt-6 border-b border-border bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap transition-colors',
                  isActive 
                    ? 'text-primary-600' 
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                
                {tab.id === 'deals' && hasDeals && (
                  <span className="flex items-center justify-center w-2 h-2 rounded-full bg-red-500" />
                )}
                
                {isActive && (
                  <motion.div
                    layoutId="store-tab-indicator"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-primary-500"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
