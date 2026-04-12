'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ShoppingCart, Menu, X, Heart, Package, User, LogIn, LogOut,
  Sparkles, Phone, MapPin, ChevronDown, Flame, Download, TrendingUp, Bell,
} from 'lucide-react';
import { useCartStore } from '@/lib/store/cart-store';
import { useWishlistStore } from '@/lib/store/wishlist-store';
import { useLocationStore, autoDetectLocation } from '@/lib/store/location-store';
import { useCategories } from '@/lib/api';
import { useAuth, searchApi } from '@xelnova/api';
import { LocationModal } from '@/components/location-modal';

type AutocompleteResult = {
  products: { type: 'product'; text: string; slug: string; image: string; price: number }[];
  categories: { type: 'category'; text: string; slug: string }[];
};

function useAutocomplete(query: string) {
  const [results, setResults] = useState<AutocompleteResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) { setResults(null); return; }
    const prev = timerRef.current;
    if (prev != null) clearTimeout(prev);
    timerRef.current = setTimeout(() => {
      searchApi.getAutocomplete(query)
        .then(setResults)
        .catch(() => setResults(null));
    }, 250);
    return () => {
      const t = timerRef.current;
      if (t != null) clearTimeout(t);
    };
  }, [query]);

  const clear = useCallback(() => setResults(null), []);
  return { results, clear };
}

const categoryIcons: Record<string, string> = {
  electronics: '⚡',
  fashion: '👗',
  'home-kitchen': '🏠',
  beauty: '✨',
  'sports-outdoors': '🏃',
  books: '📚',
  sports: '🏃',
  toys: '🧸',
  grocery: '🛒',
  health: '💊',
  automotive: '🚗',
  'baby-kids': '👶',
};

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('All Categories');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const accountRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);
  const { results: autocomplete, clear: clearAutocomplete } = useAutocomplete(searchQuery);

  const [mounted, setMounted] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const rawCartCount = useCartStore((s) => s.totalItems());
  const rawWishlistCount = useWishlistStore((s) => s.items.length);
  const cartItemCount = mounted ? rawCartCount : 0;
  const wishlistCount = mounted ? rawWishlistCount : 0;
  const location = useLocationStore((s) => s.location);
  const setLocation = useLocationStore((s) => s.setLocation);
  const autoDetected = useLocationStore((s) => s.autoDetected);
  const setAutoDetected = useLocationStore((s) => s.setAutoDetected);
  const promptDismissed = useLocationStore((s) => s.promptDismissed);
  const setPromptDismissed = useLocationStore((s) => s.setPromptDismissed);
  const { data: categories } = useCategories();
  const { user, isAuthenticated, logout, loading: authLoading } = useAuth();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const fetchCount = () => {
      fetch('/api/v1/notifications?limit=1', {
        headers: { 'Authorization': `Bearer ${typeof window !== 'undefined' ? document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/)?.[1] || '' : ''}` },
      })
        .then(r => r.json())
        .then(d => { if (!cancelled && d.success) setUnreadNotifications(d.data?.unread ?? 0); })
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isAuthenticated]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.id, user?.avatar]);

  useEffect(() => {
    if (!mounted || location || autoDetected) return;
    let cancelled = false;
    autoDetectLocation().then((detected) => {
      if (cancelled) return;
      setAutoDetected(true);
      if (detected) {
        setLocation(detected);
      }
    });
    return () => { cancelled = true; };
  }, [mounted, location, autoDetected, setLocation, setAutoDetected]);

  // Auto-show location modal after 2 seconds if no location is set and user hasn't dismissed it
  useEffect(() => {
    if (!mounted || location || promptDismissed || locationModalOpen) return;
    const timer = setTimeout(() => {
      setLocationModalOpen(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [mounted, location, promptDismissed, locationModalOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setIsAccountOpen(false);
      }
      if (
        searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node) &&
        mobileSearchContainerRef.current && !mobileSearchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchFocused(false);
      clearAutocomplete();
      const cat = searchCategory !== 'All Categories' ? `&category=${searchCategory.toLowerCase().replace(/ & /g, '-')}` : '';
      window.location.href = `/products?search=${encodeURIComponent(searchQuery.trim())}${cat}`;
    }
  };

  const handleSuggestionClick = (href: string) => {
    setSearchFocused(false);
    clearAutocomplete();
    window.location.href = href;
  };

  const showDropdown = searchFocused && autocomplete && (autocomplete.products.length > 0 || autocomplete.categories.length > 0);

  const autocompleteDropdown = (
    <AnimatePresence>
      {showDropdown && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
        >
          {autocomplete!.categories.length > 0 && (
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Categories</p>
              {autocomplete!.categories.map((cat) => (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => handleSuggestionClick(`/products?category=${cat.slug}`)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-text-secondary hover:bg-primary-50 hover:text-primary-700 transition-colors"
                >
                  <TrendingUp size={14} className="text-text-muted shrink-0" />
                  {cat.text}
                </button>
              ))}
            </div>
          )}
          {autocomplete!.products.length > 0 && (
            <div className="px-3 pt-2 pb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Products</p>
              {autocomplete!.products.slice(0, 6).map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => handleSuggestionClick(`/products/${p.slug}`)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-primary-50 transition-colors"
                >
                  {p.image && (
                    <Image src={p.image} alt="" width={36} height={36} className="h-9 w-9 rounded-lg object-cover border border-border shrink-0" />
                  )}
                  <span className="flex-1 text-left truncate text-text-primary">{p.text}</span>
                  <span className="text-xs font-semibold text-text-muted shrink-0">
                    ₹{p.price.toLocaleString('en-IN')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <header className={`sticky top-0 z-50 bg-white transition-all duration-500 ${isScrolled ? 'shadow-elevated' : ''}`}>
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600 text-[11px]">
        <div className="mx-auto max-w-[1440px] flex items-center justify-between px-4 py-1.5 sm:px-6">
          <div className="flex items-center gap-3 text-white/90">
            <button
              onClick={() => setLocationModalOpen(true)}
              className="flex items-center gap-1 hover:text-white transition-colors group"
            >
              <MapPin size={11} className="text-primary-300" />
              {location ? (
                <span>Deliver to <strong className="text-white">{location.city} {location.pincode}</strong></span>
              ) : (
                <span>Select your <strong className="text-white">location</strong></span>
              )}
              <ChevronDown size={9} className="group-hover:rotate-180 transition-transform" />
            </button>
            <span className="text-white/45 hidden sm:inline">|</span>
            <span className="hidden sm:flex items-center gap-1">
              <Phone size={10} />
              1800-123-XELNOVA
            </span>
          </div>
          <div className="flex items-center gap-3 text-white/90">
            <Link href="/download" className="hidden md:flex items-center gap-1 hover:text-white transition-colors">
              <Download size={10} />
              Get App
            </Link>
            <span className="hidden md:inline text-white/45">|</span>
            <a
              href="https://seller.xelnova.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Sell on Xelnova
            </a>
            <span className="text-white/45">|</span>
            <Link href="/track-order" className="hover:text-white transition-colors">Track Order</Link>
            <span className="text-white/45 hidden sm:inline">|</span>
            <Link href="/faq" className="hidden sm:inline hover:text-white transition-colors">Help</Link>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className={`transition-all duration-500 border-b border-border/50 ${isScrolled ? 'glass' : 'bg-white'}`}>
        <div className="mx-auto max-w-[1440px] flex items-center gap-3 px-4 py-2.5 lg:gap-5 lg:px-6">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-xl p-2 text-text-secondary hover:text-primary-600 hover:bg-primary-50 transition-colors lg:hidden"
          >
            <Menu size={22} />
          </button>

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image src="/xelnova-logo-dark.png" alt="Xelnova" width={280} height={80} className="h-8 w-auto lg:h-10" priority />
          </Link>

          {/* Search Bar with Category Dropdown + Autocomplete */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-auto">
            <div ref={searchContainerRef} className="relative flex w-full items-center rounded-xl overflow-visible border-2 border-gray-200 focus-within:border-primary-500 transition-all duration-200">
              <select
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                className="h-11 bg-gray-50 border-r border-gray-200 px-3 pr-7 text-xs font-medium text-text-secondary outline-none cursor-pointer hover:bg-gray-100 transition-colors appearance-none rounded-l-xl"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
              >
                <option value="All Categories">All Categories</option>
                {(categories || []).map((cat) => (
                  <option key={cat.slug} value={cat.name}>{cat.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search products, brands & more..."
                className="h-11 min-w-0 flex-1 bg-white px-4 text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
              <button
                type="submit"
                className="flex h-11 w-12 flex-shrink-0 items-center justify-center bg-primary-600 text-white hover:bg-primary-700 transition-colors rounded-r-xl"
              >
                <Search size={18} />
              </button>
              {autocompleteDropdown}
            </div>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-0.5 lg:gap-1 ml-auto">
            {isAuthenticated && user ? (
              <div ref={accountRef} className="relative hidden lg:block">
                <button
                  type="button"
                  onClick={() => setIsAccountOpen(!isAccountOpen)}
                  aria-expanded={isAccountOpen}
                  aria-haspopup="menu"
                  className="group flex items-center gap-2.5 rounded-2xl border border-primary-100/90 bg-gradient-to-br from-white to-primary-50/40 px-2 py-1.5 pr-2.5 shadow-sm transition-all hover:border-primary-200 hover:shadow-md"
                >
                  <div className="relative shrink-0">
                    {user.avatar && !avatarLoadFailed ? (
                      <Image
                        src={user.avatar}
                        alt=""
                        width={36}
                        height={36}
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarLoadFailed(true)}
                        className="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow-sm transition-all group-hover:ring-primary-100"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white shadow-md ring-2 ring-primary-100/80">
                        {user.name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                    )}
                  </div>
                  <span className="flex min-w-0 max-w-[9.5rem] items-center gap-1 text-left">
                    <span className="truncate font-display text-sm font-bold tracking-tight text-primary-900">
                      Hi, {user.name?.split(/\s+/)[0] || 'there'}
                    </span>
                    <ChevronDown
                      size={15}
                      className={`shrink-0 text-primary-500 transition-transform duration-200 ${isAccountOpen ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </span>
                </button>

                <AnimatePresence>
                  {isAccountOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50"
                    >
                      <div className="px-4 py-2.5 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/account/profile"
                          onClick={() => setIsAccountOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                        >
                          <User size={16} /> My Profile
                        </Link>
                        <Link
                          href="/account/orders"
                          onClick={() => setIsAccountOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                        >
                          <Package size={16} /> My Orders
                        </Link>
                        <Link
                          href="/account/wishlist"
                          onClick={() => setIsAccountOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                        >
                          <Heart size={16} /> Wishlist
                        </Link>
                      </div>
                      <div className="border-t border-gray-100 pt-1">
                        <button
                          onClick={async () => {
                            setIsAccountOpen(false);
                            await logout();
                            document.cookie = 'xelnova-token=; path=/; max-age=0';
                            document.cookie = 'xelnova-refresh-token=; path=/; max-age=0';
                            localStorage.removeItem('xelnova-auth-provider');
                            window.location.href = '/';
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut size={16} /> Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden lg:flex items-center gap-2.5 rounded-xl px-3 py-2 text-text-secondary hover:text-primary-600 hover:bg-primary-50 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                  <User size={16} className="text-primary-600" />
                </div>
                <span className="text-xs leading-tight">
                  <span className="block text-[10px] text-text-muted">Hello, Sign in</span>
                  <span className="block font-semibold text-text-primary">Account <ChevronDown size={10} className="inline" /></span>
                </span>
              </Link>
            )}

            {isAuthenticated && (
              <Link
                href="/account/notifications"
                className="relative rounded-xl p-2.5 text-text-secondary hover:text-primary-600 hover:bg-primary-50 transition-all"
              >
                <Bell size={20} />
                {unreadNotifications > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-0.5 top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white"
                  >
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </motion.span>
                )}
              </Link>
            )}

            <Link
              href="/account/wishlist"
              className="relative rounded-xl p-2.5 text-text-secondary hover:text-primary-600 hover:bg-primary-50 transition-all"
            >
              <Heart size={20} />
              {wishlistCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-0.5 top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white ring-2 ring-white"
                >
                  {wishlistCount}
                </motion.span>
              )}
            </Link>

            <Link
              href="/account/orders"
              className="hidden lg:flex items-center gap-1.5 rounded-xl px-3 py-2 text-text-secondary hover:text-primary-600 hover:bg-primary-50 transition-all"
            >
              <Package size={18} />
              <span className="text-xs font-semibold">Orders</span>
            </Link>

            <Link
              href="/cart"
              className="relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-text-secondary hover:text-primary-600 hover:bg-primary-50 transition-all"
            >
              <div className="relative">
                <ShoppingCart size={22} />
                {cartItemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500 }}
                    className="absolute -right-2.5 -top-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white ring-2 ring-white"
                  >
                    {cartItemCount}
                  </motion.span>
                )}
              </div>
              <span className="hidden lg:inline text-xs font-semibold">Cart</span>
            </Link>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden px-4 pb-2.5">
          <form onSubmit={handleSearch}>
            <div ref={mobileSearchContainerRef} className="relative flex items-center rounded-xl overflow-visible border-2 border-gray-200 focus-within:border-primary-500 transition-all">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search products, brands & more..."
                className="h-10 flex-1 bg-white px-3 text-sm text-text-primary outline-none placeholder:text-text-muted rounded-l-xl"
              />
              <button type="submit" className="flex h-10 w-10 items-center justify-center bg-primary-600 text-white rounded-r-xl">
                <Search size={16} />
              </button>
              {autocompleteDropdown}
            </div>
          </form>
        </div>
      </div>

      {/* Category Navigation + Sale Badge */}
      <div className={`border-b border-border/40 transition-all duration-500 ${isScrolled ? 'glass' : 'bg-white'}`}>
        <div className="mx-auto max-w-[1440px] flex items-center px-4 lg:px-6">
          <div className="relative flex-1 min-w-0">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none opacity-0 transition-opacity" id="cat-fade-left" />
            <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide scroll-smooth" id="category-scroll">
              {(categories || []).map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/products?category=${cat.slug}`}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 text-sm text-text-secondary hover:text-primary-700 hover:bg-primary-50 transition-all rounded-lg font-medium"
                >
                  <span className="text-sm">{categoryIcons[cat.slug] || '🛍️'}</span>
                  {cat.name}
                </Link>
              ))}
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" id="cat-fade-right" />
          </div>
          <div className="flex-shrink-0 flex items-center gap-3 pl-3 border-l border-border/30 ml-2">
            <Link
              href="/products?deals=sale"
              className="hidden sm:flex flex-shrink-0 items-center gap-1.5 bg-gradient-to-r from-danger-500 to-accent-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-full animate-pulse-soft"
            >
              <Flame size={12} />
              Mega Sale — Up to 70% Off
            </Link>
            <a
              href="https://seller.xelnova.in"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-1 px-3 py-2.5 text-sm font-semibold text-accent-600 hover:bg-accent-50 transition-colors rounded-lg"
            >
              <Sparkles size={14} />
              Sell on Xelnova
            </a>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-[101] w-[300px] bg-white shadow-2xl flex flex-col"
            >
              {/* Sidebar Header */}
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {isAuthenticated && user ? (
                      <>
                        {user.avatar && !avatarLoadFailed ? (
                          <Image
                            src={user.avatar}
                            alt=""
                            width={44}
                            height={44}
                            referrerPolicy="no-referrer"
                            onError={() => setAvatarLoadFailed(true)}
                            className="h-11 w-11 rounded-full object-cover ring-2 ring-white/50 shadow-lg"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-white/30 to-white/10 text-lg font-bold text-white shadow-lg ring-2 ring-white/40 backdrop-blur-sm">
                            {user.name?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-display text-base font-bold leading-tight text-white drop-shadow-sm">
                            Hi, {user.name?.split(/\s+/)[0] || 'there'}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-primary-100/90">{user.email}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                          <User size={18} className="text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">Hello, Guest</p>
                          <Link href="/login" className="text-xs text-primary-200 hover:text-white transition-colors">
                            Sign in or Register →
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="rounded-lg p-1.5 text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto py-3">
                <div className="px-4 pb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted">Shop by Category</p>
                </div>
                {(categories || []).map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/products?category=${cat.slug}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between px-5 py-3 text-sm text-text-secondary hover:bg-primary-50 hover:text-primary-700 transition-colors"
                  >
                    {cat.name}
                    <span className="text-[10px] text-text-muted bg-surface-raised px-2 py-0.5 rounded-full">{cat.productCount}</span>
                  </Link>
                ))}

                <div className="my-3 mx-5 border-t border-border" />

                <div className="px-4 pb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted">Your Account</p>
                </div>
                {(isAuthenticated
                  ? [
                      { href: '/account/profile', icon: User, label: 'My Profile' },
                      { href: '/account/orders', icon: Package, label: 'Your Orders' },
                      { href: '/account/wishlist', icon: Heart, label: 'Wishlist' },
                      { href: '/track-order', icon: MapPin, label: 'Track Order' },
                    ]
                  : [
                      { href: '/login', icon: LogIn, label: 'Sign In' },
                      { href: '/account/orders', icon: Package, label: 'Your Orders' },
                      { href: '/account/wishlist', icon: Heart, label: 'Wishlist' },
                      { href: '/track-order', icon: MapPin, label: 'Track Order' },
                    ]
                ).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-5 py-3 text-sm text-text-secondary hover:bg-primary-50 hover:text-primary-700 transition-colors"
                  >
                    <item.icon size={16} />
                    {item.label}
                  </Link>
                ))}
                {isAuthenticated && (
                  <button
                    onClick={async () => {
                      setIsMobileMenuOpen(false);
                      await logout();
                      document.cookie = 'xelnova-token=; path=/; max-age=0';
                      document.cookie = 'xelnova-refresh-token=; path=/; max-age=0';
                      localStorage.removeItem('xelnova-auth-provider');
                      window.location.href = '/';
                    }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                )}
              </nav>

              <div className="border-t border-border p-4">
                <a
                  href="https://seller.xelnova.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-primary"
                >
                  <Sparkles size={14} />
                  Sell on Xelnova
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <LocationModal 
        open={locationModalOpen} 
        onClose={() => {
          setLocationModalOpen(false);
          setPromptDismissed(true);
        }} 
      />
    </header>
  );
}
