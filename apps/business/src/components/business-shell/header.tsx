'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Building2, ShoppingCart, Search, LogIn, LogOut, Settings } from 'lucide-react';
import { useAuth, businessApi, getAccessToken } from '@xelnova/api';
import { useCartStore } from '@/lib/store/cart-store';

export function BusinessHeader() {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const [orgLabel, setOrgLabel] = useState<string | null>(null);
  const cartCount = useCartStore((s) => s.totalItems());

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'BUSINESS') {
      setOrgLabel(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        if (typeof window !== 'undefined' && !getAccessToken()) return;
        const orgs = await businessApi.listOrganizations();
        if (cancelled) return;
        const storedId = typeof window !== 'undefined' ? localStorage.getItem('xelnova-business-org-id') : null;
        const pick = orgs.find((o) => o.id === storedId) ?? orgs[0];
        if (pick) {
          setOrgLabel(pick.name);
          if (typeof window !== 'undefined') localStorage.setItem('xelnova-business-org-id', pick.id);
        } else {
          setOrgLabel(null);
        }
      } catch {
        if (!cancelled) setOrgLabel(null);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.role]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="bg-slate-900 px-4 py-2 text-center text-xs text-slate-100">
        Buying for work? You&apos;re on{' '}
        <span className="font-semibold text-white">Xelnova Business</span> — GSTIN and company details apply at
        checkout (India).
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Building2 className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            Xelnova <span className="text-slate-500 font-semibold">Business</span>
          </span>
        </Link>

        {orgLabel && (
          <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex md:justify-center">
            <span className="truncate rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              Organization: <span className="text-slate-900">{orgLabel}</span>
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/search"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Search catalog"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link href="/cart" className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
          {isAuthenticated && (
            <Link
              href="/settings/organization"
              className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 sm:block"
              aria-label="Organization settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
          )}
          {loading ? (
            <span className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
          ) : isAuthenticated ? (
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          )}
        </div>
      </div>
      <nav className="border-t border-slate-100 bg-white px-4 py-2 text-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-1">
          <Link href="/products" className="text-slate-700 hover:text-primary-600">
            Catalog
          </Link>
          <Link href="/search" className="text-slate-700 hover:text-primary-600">
            Search
          </Link>
          <Link href="/account/orders" className="text-slate-700 hover:text-primary-600">
            Orders
          </Link>
          <Link href="/cart" className="text-slate-700 hover:text-primary-600">
            Cart
          </Link>
          <Link href="/settings/organization" className="text-slate-700 hover:text-primary-600">
            Company &amp; tax
          </Link>
        </div>
      </nav>
    </header>
  );
}
