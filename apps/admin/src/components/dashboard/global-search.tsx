'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Package,
  ShoppingCart,
  Store,
  Users,
  Star,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react';

/**
 * Lightweight global search / quick-jump for the admin console.
 *
 * Behaviour:
 *  - Typing filters the sidebar nav items + surfaces "Search X for: <query>"
 *    jump entries that navigate to the relevant list page with `?search=...`.
 *  - Enter triggers the highlighted result (defaults to "Search products" so
 *    admins can fuzzy-find a SKU/listing by just typing + ↵).
 *  - Cmd/Ctrl + K toggles the search.
 *  - Esc / outside-click closes it.
 *
 * Server search isn't required here because every list page already supports
 * client-side search and reads `?search=X` on mount.
 */

type NavItem = { label: string; href: string; group: string };

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', group: 'Overview' },
  { label: 'Performance', href: '/performance', group: 'Overview' },
  { label: 'System Logs', href: '/logs', group: 'Overview' },
  { label: 'Verifications', href: '/verifications', group: 'Overview' },
  { label: 'Feature Flags', href: '/feature-flags', group: 'Overview' },
  { label: 'Products', href: '/products', group: 'Ecommerce' },
  { label: 'Reviews', href: '/reviews', group: 'Ecommerce' },
  { label: 'Categories', href: '/categories', group: 'Ecommerce' },
  { label: 'Brands', href: '/brands', group: 'Ecommerce' },
  { label: 'Banners', href: '/banners', group: 'Ecommerce' },
  { label: 'Flash Deals', href: '/flash-deals', group: 'Ecommerce' },
  { label: 'Coupons', href: '/coupons', group: 'Ecommerce' },
  { label: 'CMS Pages', href: '/pages', group: 'Ecommerce' },
  { label: 'Orders', href: '/orders', group: 'Orders & users' },
  { label: 'Support Tickets', href: '/tickets', group: 'Orders & users' },
  { label: 'Customers', href: '/customers', group: 'Orders & users' },
  { label: 'Sellers', href: '/sellers', group: 'Orders & users' },
  { label: 'Seller Onboarding', href: '/seller-onboarding', group: 'Orders & users' },
  { label: 'Revenue', href: '/revenue', group: 'Finance' },
  { label: 'Commission', href: '/commission', group: 'Finance' },
  { label: 'Payouts', href: '/payouts', group: 'Finance' },
  { label: 'Advance Payouts', href: '/advance-payouts', group: 'Finance' },
  { label: 'Wallets', href: '/wallets', group: 'Finance' },
  { label: 'All Reports', href: '/reports', group: 'Finance' },
  { label: 'Duplicate Listings', href: '/duplicates', group: 'Risk & growth' },
  { label: 'Pricing Flags', href: '/pricing-flags', group: 'Risk & growth' },
  { label: 'Abandoned Carts', href: '/abandoned-carts', group: 'Risk & growth' },
  { label: 'Fraud Detection', href: '/fraud-flags', group: 'Risk & growth' },
  { label: 'Roles', href: '/roles', group: 'System' },
  { label: 'Settings', href: '/settings', group: 'System' },
];

const QUICK_JUMPS: { label: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Orders', href: '/orders', icon: ShoppingCart },
  { label: 'Sellers', href: '/sellers', icon: Store },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Reviews', href: '/reviews', icon: Star },
];

type Result =
  | { kind: 'nav'; item: NavItem }
  | { kind: 'jump'; label: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }>; query: string };

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMeta = e.ctrlKey || e.metaKey;
      if (isMeta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const out: Result[] = [];

    if (q) {
      for (const j of QUICK_JUMPS) {
        out.push({ kind: 'jump', label: j.label, href: j.href, icon: j.icon, query });
      }
    }

    const matchingNav = NAV_ITEMS.filter((item) =>
      q ? item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q) : true,
    ).slice(0, q ? 8 : 12);

    for (const item of matchingNav) {
      out.push({ kind: 'nav', item });
    }
    return out;
  }, [query]);

  const navigate = (r: Result) => {
    if (r.kind === 'jump') {
      router.push(`${r.href}?search=${encodeURIComponent(r.query)}`);
    } else {
      router.push(r.item.href);
    }
    setOpen(false);
    setQuery('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[activeIdx];
      if (target) navigate(target);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-1.5 text-sm text-text-muted hover:bg-surface-muted transition-colors min-w-[260px]"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open global search"
      >
        <Search size={16} className="shrink-0" />
        <span className="flex-1 text-left text-text-muted">Search products, orders, sellers…</span>
        <kbd className="rounded border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-text-muted hidden sm:inline">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Global search"
          className="absolute right-0 top-full z-50 mt-2 w-[360px] sm:w-[420px] rounded-2xl border border-border bg-surface shadow-xl overflow-hidden"
        >
          <div className="flex items-center gap-2 border-b border-border bg-surface-muted/30 px-3 py-2.5">
            <Search size={16} className="text-text-muted shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a name, SKU, order # or page…"
              className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
            <kbd className="text-[10px] text-text-muted hidden sm:inline">Esc</kbd>
          </div>

          <div className="max-h-[60vh] overflow-y-auto py-1">
            {results.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">No results.</p>
            ) : (
              results.map((r, i) => {
                const active = i === activeIdx;
                if (r.kind === 'jump') {
                  const Icon = r.icon;
                  return (
                    <button
                      key={`jump-${r.label}-${i}`}
                      type="button"
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => navigate(r)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                        active ? 'bg-primary-50 text-primary-700' : 'hover:bg-surface-muted text-text-primary'
                      }`}
                    >
                      <Icon size={16} className="shrink-0 text-text-muted" />
                      <span className="flex-1 truncate">
                        Search <span className="font-semibold">{r.label}</span> for{' '}
                        <span className="text-primary-600">&ldquo;{r.query}&rdquo;</span>
                      </span>
                      <ArrowRight size={14} className="shrink-0 opacity-60" />
                    </button>
                  );
                }
                return (
                  <button
                    key={`nav-${r.item.href}-${i}`}
                    type="button"
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => navigate(r)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                      active ? 'bg-primary-50 text-primary-700' : 'hover:bg-surface-muted text-text-primary'
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-wider text-text-muted w-20 shrink-0">{r.item.group}</span>
                    <span className="flex-1 truncate">{r.item.label}</span>
                    <CornerDownLeft size={14} className="shrink-0 opacity-50" />
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border bg-surface-muted/30 px-3 py-1.5 text-[11px] text-text-muted">
            <span>↑↓ navigate · ↵ open</span>
            <span>Ctrl K to toggle</span>
          </div>
        </div>
      )}
    </div>
  );
}
