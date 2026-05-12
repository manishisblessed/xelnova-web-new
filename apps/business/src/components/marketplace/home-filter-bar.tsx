'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Star,
  Truck,
  Clock,
  Sparkles,
  Check,
  Zap,
} from 'lucide-react';
import { cn } from '@xelnova/utils';
import type { Category } from '@/lib/data/categories';

interface HomeFilterBarProps {
  categories: Category[];
  brands: { id: string; name: string; slug: string }[];
}

const PRICE_RANGES = [
  { label: 'Up to ₹400', min: 0, max: 400 },
  { label: '₹400 - ₹600', min: 400, max: 600 },
  { label: '₹600 - ₹800', min: 600, max: 800 },
  { label: '₹800 - ₹1,200', min: 800, max: 1200 },
  { label: 'Over ₹1,200', min: 1200, max: null },
];

const DELIVERY_OPTIONS = [
  { label: 'Get It by Tomorrow', value: 'tomorrow', icon: Truck },
  { label: 'Get It in 2 Days', value: '2days', icon: Clock },
  { label: 'Tomorrow by 11AM', value: 'express', icon: Sparkles },
];

const DISCOUNT_OPTIONS = [
  { label: 'All Discounts', value: 0 },
  { label: '10% Off or More', value: 10 },
  { label: '25% Off or More', value: 25 },
  { label: '50% Off or More', value: 50 },
  { label: '70% Off or More', value: 70 },
];

const SORT_OPTIONS = [
  { label: 'Popular', value: 'popular' },
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Avg. Rating', value: 'rating' },
];

const AVAILABILITY_OPTIONS = [
  { label: 'In Stock', value: 'in-stock' },
  { label: 'Include Out of Stock', value: 'all' },
];

const SHIPPING_OPTIONS = [
  { label: 'Free Shipping', value: 'free' },
  { label: 'Same Day Delivery', value: 'same-day' },
  { label: 'Standard Shipping', value: 'standard' },
];

export function HomeFilterBar({ categories, brands }: HomeFilterBarProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const rafRef = useRef<number>(0);

  const checkScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    });
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      el?.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [checkScroll]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const buildQueryString = (filters: Record<string, any>) => {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.brand) params.set('brand', filters.brand);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (filters.minRating) params.set('minRating', filters.minRating);
    if (filters.discount) params.set('discount', filters.discount);
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.availability) params.set('availability', filters.availability);
    if (filters.delivery) params.set('delivery', filters.delivery);
    if (filters.deals) params.set('deals', filters.deals);
    if (filters.shipping) params.set('shipping', filters.shipping);
    return params.toString();
  };

  const applyFilter = (key: string, value: any) => {
    const newFilters = { ...activeFilters };
    if (value === null || value === undefined) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setActiveFilters(newFilters);
    setOpenDropdown(null);
    const query = buildQueryString(newFilters);
    router.push(`/products${query ? `?${query}` : ''}`);
  };

  const applyPriceRange = (min: number, max: number | null) => {
    const newFilters: Record<string, any> = { ...activeFilters, minPrice: min };
    if (max) newFilters.maxPrice = max;
    else delete newFilters.maxPrice;
    setActiveFilters(newFilters);
    setOpenDropdown(null);
    const query = buildQueryString(newFilters);
    router.push(`/products?${query}`);
  };

  const handleQuickFilter = (type: string, value: any) => {
    const newFilters = { ...activeFilters };
    if (type === 'rating') {
      newFilters.minRating = value;
    } else if (type === 'delivery') {
      newFilters.delivery = value;
    } else if (type === 'deals') {
      newFilters.deals = value;
    }
    setActiveFilters(newFilters);
    const query = buildQueryString(newFilters);
    router.push(`/products?${query}`);
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0;
  const activeFilterCount = Object.keys(activeFilters).length;

  return (
    <section className="py-2 sticky top-[64px] z-40 bg-white/98 backdrop-blur-lg border-b border-gray-100/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6">
        <div className="relative flex items-center gap-2">
          {/* Filter count badge / Filters button */}
          <div className="flex-shrink-0 flex items-center">
            <button
              onClick={() => {
                if (hasActiveFilters) {
                  setActiveFilters({});
                  router.push('/');
                }
              }}
              title={hasActiveFilters ? 'Clear all filters' : 'Filters'}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                hasActiveFilters
                  ? 'border-primary-400 bg-primary-50 text-primary-700 shadow-sm cursor-pointer'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50/50'
              )}
            >
              <SlidersHorizontal size={16} />
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Left scroll button */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white/90 border border-gray-200 shadow-sm hover:bg-gray-50 hover:shadow transition-all z-10"
            >
              <ChevronLeft size={15} className="text-gray-600" />
            </button>
          )}

          {/* Scrollable filter chips */}
          <div
            ref={scrollRef}
            className="flex-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide py-1 scroll-smooth"
          >
            {/* Quick delivery filters */}
            {DELIVERY_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                onClick={() => handleQuickFilter('delivery', opt.value)}
                active={activeFilters.delivery === opt.value}
              >
                <opt.icon size={13} className="mr-1 flex-shrink-0" />
                <span className="hidden xs:inline">{opt.label}</span>
                <span className="xs:hidden">{opt.value === 'tomorrow' ? 'Tomorrow' : opt.value === '2days' ? '2 Days' : 'Express'}</span>
              </FilterChip>
            ))}

            {/* Rating filter */}
            <FilterChip
              onClick={() => handleQuickFilter('rating', 4)}
              active={activeFilters.minRating === 4}
            >
              <Star size={13} className="mr-1 fill-amber-400 text-amber-400 flex-shrink-0" />
              4★ & Up
            </FilterChip>

            {/* All Discounts quick filter */}
            <FilterChip
              onClick={() => applyFilter('discount', 'all')}
              active={activeFilters.discount === 'all'}
            >
              All Discounts
            </FilterChip>

            {/* Today's Deals */}
            <FilterChip
              onClick={() => handleQuickFilter('deals', 'today')}
              active={activeFilters.deals === 'today'}
              variant="highlight"
            >
              <Zap size={13} className="mr-1 flex-shrink-0" />
              Today&apos;s Deals
            </FilterChip>

            {/* Price range chips */}
            {PRICE_RANGES.map((range) => (
              <FilterChip
                key={range.label}
                onClick={() => applyPriceRange(range.min, range.max)}
                active={
                  activeFilters.minPrice === range.min &&
                  (range.max ? activeFilters.maxPrice === range.max : !activeFilters.maxPrice)
                }
              >
                {range.label}
              </FilterChip>
            ))}

            {/* Dropdown filters */}
            <DropdownFilter
              label="Popular"
              isOpen={openDropdown === 'sort'}
              onToggle={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
            >
              {SORT_OPTIONS.map((opt) => (
                <DropdownItem
                  key={opt.value}
                  onClick={() => applyFilter('sort', opt.value)}
                  active={activeFilters.sort === opt.value}
                >
                  {opt.label}
                </DropdownItem>
              ))}
            </DropdownFilter>

            <DropdownFilter
              label="Brands"
              isOpen={openDropdown === 'brands'}
              onToggle={() => setOpenDropdown(openDropdown === 'brands' ? null : 'brands')}
            >
              <div className="max-h-64 overflow-y-auto">
                {brands.length > 0 ? (
                  brands.slice(0, 20).map((brand) => (
                    <DropdownItem
                      key={brand.id}
                      onClick={() => applyFilter('brand', brand.slug)}
                      active={activeFilters.brand === brand.slug}
                    >
                      {brand.name}
                    </DropdownItem>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500">Loading brands...</div>
                )}
              </div>
            </DropdownFilter>

            <DropdownFilter
              label="Discount"
              isOpen={openDropdown === 'discount'}
              onToggle={() => setOpenDropdown(openDropdown === 'discount' ? null : 'discount')}
            >
              {DISCOUNT_OPTIONS.map((opt) => (
                <DropdownItem
                  key={opt.value}
                  onClick={() => applyFilter('discount', opt.value || 'all')}
                  active={
                    activeFilters.discount === opt.value ||
                    (opt.value === 0 && activeFilters.discount === 'all')
                  }
                >
                  {opt.label}
                </DropdownItem>
              ))}
            </DropdownFilter>

            <DropdownFilter
              label="Category"
              isOpen={openDropdown === 'category'}
              onToggle={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
            >
              <div className="max-h-64 overflow-y-auto">
                {categories.map((cat) => (
                  <DropdownItem
                    key={cat.id}
                    onClick={() => applyFilter('category', cat.slug)}
                    active={activeFilters.category === cat.slug}
                  >
                    <span className="flex-1">{cat.name}</span>
                    {cat.productCount > 0 && (
                      <span className="text-xs text-gray-400 ml-2">{cat.productCount}</span>
                    )}
                  </DropdownItem>
                ))}
              </div>
            </DropdownFilter>

            <DropdownFilter
              label="Shipping Options"
              isOpen={openDropdown === 'shipping'}
              onToggle={() => setOpenDropdown(openDropdown === 'shipping' ? null : 'shipping')}
            >
              {SHIPPING_OPTIONS.map((opt) => (
                <DropdownItem
                  key={opt.value}
                  onClick={() => applyFilter('shipping', opt.value)}
                  active={activeFilters.shipping === opt.value}
                >
                  {opt.label}
                </DropdownItem>
              ))}
            </DropdownFilter>

            <DropdownFilter
              label="New Arrivals"
              isOpen={openDropdown === 'arrivals'}
              onToggle={() => setOpenDropdown(openDropdown === 'arrivals' ? null : 'arrivals')}
            >
              <DropdownItem
                onClick={() => applyFilter('sort', 'newest')}
                active={activeFilters.sort === 'newest'}
              >
                Last 30 days
              </DropdownItem>
              <DropdownItem
                onClick={() => {
                  const newFilters = { ...activeFilters, sort: 'newest' };
                  setActiveFilters(newFilters);
                  router.push(`/products?sort=newest&days=90`);
                }}
              >
                Last 90 days
              </DropdownItem>
            </DropdownFilter>

            <DropdownFilter
              label="Availability"
              isOpen={openDropdown === 'availability'}
              onToggle={() => setOpenDropdown(openDropdown === 'availability' ? null : 'availability')}
            >
              {AVAILABILITY_OPTIONS.map((opt) => (
                <DropdownItem
                  key={opt.value}
                  onClick={() => applyFilter('availability', opt.value)}
                  active={activeFilters.availability === opt.value}
                >
                  {opt.label}
                </DropdownItem>
              ))}
            </DropdownFilter>
          </div>

          {/* Right scroll button */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white/90 border border-gray-200 shadow-sm hover:bg-gray-50 hover:shadow transition-all z-10"
            >
              <ChevronRight size={15} className="text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Backdrop for closing dropdowns */}
      {openDropdown && (
        <div className="fixed inset-0 z-30" onClick={() => setOpenDropdown(null)} />
      )}
    </section>
  );
}

interface FilterChipProps {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  variant?: 'default' | 'highlight';
}

function FilterChip({ children, onClick, active, variant = 'default' }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-shrink-0 flex items-center px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium border transition-all whitespace-nowrap',
        'active:scale-[0.98]',
        active
          ? 'bg-primary-600 text-white border-primary-600 shadow-sm shadow-primary-200'
          : variant === 'highlight'
            ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200 hover:border-amber-400 hover:shadow-sm hover:from-amber-100 hover:to-orange-100'
            : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:bg-primary-50/30 hover:text-primary-700'
      )}
    >
      {children}
    </button>
  );
}

interface DropdownFilterProps {
  label: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

function DropdownFilter({ label, children, isOpen, onToggle }: DropdownFilterProps) {
  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center gap-1 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium border transition-all whitespace-nowrap',
          'active:scale-[0.98]',
          isOpen
            ? 'bg-primary-50 text-primary-700 border-primary-300 shadow-sm'
            : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:bg-primary-50/30 hover:text-primary-700'
        )}
      >
        {label}
        <ChevronDown
          size={13}
          className={cn('transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 min-w-[180px] bg-white rounded-xl border border-gray-100 shadow-xl shadow-gray-200/50 z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}

function DropdownItem({ children, onClick, active }: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors',
        active
          ? 'bg-primary-50 text-primary-700 font-medium'
          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
      )}
    >
      {active && <Check size={14} className="text-primary-600 flex-shrink-0" />}
      <span className={cn('flex-1 flex items-center', !active && 'ml-6')}>{children}</span>
    </button>
  );
}
