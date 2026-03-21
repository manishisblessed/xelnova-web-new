'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ShoppingCart, Menu, X, Heart, Package, User, LogIn,
  Sparkles, Phone, MapPin, ChevronDown, Flame, Bell, Download,
} from 'lucide-react';
import { useCartStore } from '@/lib/store/cart-store';
import { useWishlistStore } from '@/lib/store/wishlist-store';
import { useCategories } from '@/lib/api';

const navCategories = [
  { name: 'Electronics', slug: 'electronics', icon: '⚡' },
  { name: 'Fashion', slug: 'fashion', icon: '👗' },
  { name: 'Home & Kitchen', slug: 'home-kitchen', icon: '🏠' },
  { name: 'Beauty', slug: 'beauty', icon: '✨' },
  { name: 'Sports', slug: 'sports-outdoors', icon: '🏃' },
  { name: 'Books', slug: 'books', icon: '📚' },
];

const searchCategories = ['All Categories', 'Electronics', 'Fashion', 'Home & Kitchen', 'Beauty', 'Sports', 'Books'];

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('All Categories');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const cartItemCount = useCartStore((s) => s.totalItems());
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const { data: categories } = useCategories();

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
      const cat = searchCategory !== 'All Categories' ? `&category=${searchCategory.toLowerCase().replace(/ & /g, '-')}` : '';
      window.location.href = `/products?search=${encodeURIComponent(searchQuery.trim())}${cat}`;
    }
  };

  return (
    <header className={`sticky top-0 z-50 transition-all duration-500 ${isScrolled ? 'shadow-elevated' : ''}`}>
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-primary-800 via-primary-700 to-primary-800 text-[11px]">
        <div className="mx-auto max-w-[1440px] flex items-center justify-between px-4 py-1.5 sm:px-6">
          <div className="flex items-center gap-3 text-white/75">
            <button className="flex items-center gap-1 hover:text-white transition-colors group">
              <MapPin size={11} className="text-primary-300" />
              <span>Deliver to <strong className="text-white">Mumbai 400001</strong></span>
              <ChevronDown size={9} className="group-hover:rotate-180 transition-transform" />
            </button>
            <span className="text-white/20 hidden sm:inline">|</span>
            <span className="hidden sm:flex items-center gap-1">
              <Phone size={10} />
              1800-123-XELNOVA
            </span>
          </div>
          <div className="flex items-center gap-3 text-white/75">
            <Link href="/download" className="hidden md:flex items-center gap-1 hover:text-white transition-colors">
              <Download size={10} />
              Get App
            </Link>
            <span className="hidden md:inline text-white/20">|</span>
            <Link href="/seller" className="hover:text-white transition-colors">Sell on Xelnova</Link>
            <span className="text-white/20">|</span>
            <Link href="/track-order" className="hover:text-white transition-colors">Track Order</Link>
            <span className="text-white/20 hidden sm:inline">|</span>
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
            <Image src="/xelnova-logo.png" alt="Xelnova" width={140} height={40} className="h-7 w-auto lg:h-9" priority />
          </Link>

          {/* Search Bar with Category Dropdown */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-auto">
            <div className="relative flex w-full items-center rounded-xl overflow-hidden border-2 border-gray-200 focus-within:border-primary-500 transition-all duration-200">
              <select
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                className="h-11 bg-gray-50 border-r border-gray-200 px-3 pr-7 text-xs font-medium text-text-secondary outline-none cursor-pointer hover:bg-gray-100 transition-colors appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
              >
                {searchCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, brands & more..."
                className="h-11 min-w-0 flex-1 bg-white px-4 text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
              <button
                type="submit"
                className="flex h-11 w-12 flex-shrink-0 items-center justify-center bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              >
                <Search size={18} />
              </button>
            </div>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-0.5 lg:gap-1 ml-auto">
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
            <div className="flex items-center rounded-xl overflow-hidden border-2 border-gray-200 focus-within:border-primary-500 transition-all">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, brands & more..."
                className="h-10 flex-1 bg-white px-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
              <button type="submit" className="flex h-10 w-10 items-center justify-center bg-primary-600 text-white">
                <Search size={16} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Category Navigation + Sale Badge */}
      <div className={`border-b border-border/40 transition-all duration-500 ${isScrolled ? 'glass' : 'bg-white'}`}>
        <div className="mx-auto max-w-[1440px] flex items-center gap-0.5 overflow-x-auto px-4 scrollbar-hide lg:px-6">
          {navCategories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 text-sm text-text-secondary hover:text-primary-700 hover:bg-primary-50 transition-all rounded-lg font-medium"
            >
              <span className="text-sm">{cat.icon}</span>
              {cat.name}
            </Link>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/products?deals=sale"
              className="hidden sm:flex flex-shrink-0 items-center gap-1.5 bg-gradient-to-r from-danger-500 to-accent-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-full animate-pulse-soft"
            >
              <Flame size={12} />
              Mega Sale — Up to 70% Off
            </Link>
            <Link
              href="/seller"
              className="flex-shrink-0 flex items-center gap-1 px-3 py-2.5 text-sm font-semibold text-accent-600 hover:bg-accent-50 transition-colors rounded-lg"
            >
              <Sparkles size={14} />
              Sell on Xelnova
            </Link>
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
              <div className="bg-gradient-to-r from-primary-700 to-primary-600 px-5 py-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <User size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Hello, Guest</p>
                      <Link href="/login" className="text-xs text-primary-200 hover:text-white transition-colors">
                        Sign in or Register →
                      </Link>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
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
                {[
                  { href: '/login', icon: LogIn, label: 'Sign In' },
                  { href: '/account/orders', icon: Package, label: 'Your Orders' },
                  { href: '/account/wishlist', icon: Heart, label: 'Wishlist' },
                  { href: '/track-order', icon: MapPin, label: 'Track Order' },
                ].map((item) => (
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
              </nav>

              <div className="border-t border-border p-4">
                <Link
                  href="/seller"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-primary"
                >
                  <Sparkles size={14} />
                  Sell on Xelnova
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
