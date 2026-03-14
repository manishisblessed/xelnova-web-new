'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Bell, ChevronDown, LogOut, User,
  Settings, Command, Moon, Sun,
} from 'lucide-react';

const breadcrumbMap: Record<string, string> = {
  '/': 'Dashboard',
  '/orders': 'Orders',
  '/products': 'Products',
  '/customers': 'Customers',
  '/categories': 'Categories',
  '/brands': 'Brands',
  '/sellers': 'Sellers',
  '/revenue': 'Revenue',
  '/payouts': 'Payouts',
  '/coupons': 'Coupons',
  '/banners': 'Banners',
  '/flash-deals': 'Flash Deals',
  '/pages': 'Pages',
  '/settings': 'Settings',
  '/roles': 'Roles',
  '/commission': 'Commission',
};

/** Resolve header title from pathname so nested routes (e.g. /orders/123) show the section name */
function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) return 'Dashboard';
  const path = '/' + segment;
  return breadcrumbMap[path] ?? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}

export function AdminHeader() {
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentPage = getPageTitle(pathname);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setShowDropdown(false);
        searchRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="flex h-[64px] items-center justify-between px-6">
      {/* Left: Page title + date */}
      <div className="flex items-center gap-4">
        <h1 className="font-display text-lg font-semibold text-heading">{currentPage}</h1>
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 sm:flex">
          <span className="text-[12px] text-muted">
            {new Date().toLocaleDateString('en-US', {
              day: '2-digit', month: '2-digit', year: 'numeric',
            })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${searchFocused ? 'text-primary-400' : 'text-subtle'}`} />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="input-field h-[34px] w-44 pl-9 pr-14 text-[12px] transition-[width,border-color,box-shadow] duration-200 ease-out focus:w-56"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-md border border-border bg-surface-4 px-1.5 py-[2px]">
            <Command size={9} className="text-subtle" />
            <span className="text-[9px] font-medium text-subtle">K</span>
          </div>
        </div>

        {/* Theme Toggle (decorative) */}
        <div className="flex items-center gap-1 rounded-full border border-border bg-surface-2 p-1">
          <button className="rounded-full p-1.5 text-subtle transition-colors duration-200 hover:text-heading active:scale-95">
            <Sun size={13} />
          </button>
          <button className="rounded-full bg-primary-500 p-1.5 text-white transition-transform duration-200 active:scale-95">
            <Moon size={13} />
          </button>
        </div>

        {/* Notifications */}
        <button className="relative flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-border bg-surface-2 text-muted transition-all duration-200 hover:text-heading hover:bg-surface-3 active:scale-95">
          <Bell size={15} strokeWidth={1.6} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary-400 ring-2 ring-surface-2" />
        </button>

        {/* Profile */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors duration-200 hover:bg-surface-2 active:scale-[0.98]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-300 to-primary-500 text-[11px] font-bold text-white ring-2 ring-surface-3">
              A
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-[13px] font-medium text-heading">Admin</p>
            </div>
            <ChevronDown size={13} className={`text-muted transition-transform duration-200 ease-out ${showDropdown ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] as const }}
                className="absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-xl border border-border bg-surface-3 shadow-dropdown"
              >
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-heading">Admin User</p>
                  <p className="text-[11px] text-muted">admin@xelnova.com</p>
                </div>
                <div className="py-1">
                  <button className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-body transition-colors hover:bg-surface-4"><User size={14} /> Profile</button>
                  <button className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-body transition-colors hover:bg-surface-4"><Settings size={14} /> Settings</button>
                </div>
                <div className="border-t border-border py-1">
                  <button className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-danger-400 transition-colors hover:bg-danger-50"><LogOut size={14} /> Sign out</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
