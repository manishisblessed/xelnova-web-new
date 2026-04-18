'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Package,
  Store,
  Wallet,
  CreditCard,
  Tag,
  Ticket,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react';

/**
 * Global search / quick-jump for the seller console. Mirrors the admin
 * implementation: filters sidebar nav items + offers "Search products /
 * orders for: <query>" jumps that drop the seller into the relevant page
 * with the search prefilled via `?search=...`.
 */

type NavItem = { label: string; href: string };

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Orders', href: '/orders' },
  { label: 'Inventory', href: '/inventory' },
  { label: 'Brand Store', href: '/store' },
  { label: 'Bulk Upload', href: '/bulk-upload' },
  { label: 'Stock Alerts', href: '/inventory-alerts' },
  { label: 'Brands', href: '/brands' },
  { label: 'Coupons', href: '/coupons' },
  { label: 'Payouts', href: '/payouts' },
  { label: 'Settlement', href: '/settlement' },
  { label: 'Analytics', href: '/analytics' },
  { label: 'Wallet', href: '/wallet' },
  { label: 'Shipping', href: '/shipping' },
  { label: 'Support Tickets', href: '/tickets' },
  { label: 'My Profile', href: '/profile' },
];

const QUICK_JUMPS: { label: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { label: 'Products', href: '/inventory', icon: Package },
  { label: 'Orders', href: '/orders', icon: Store },
  { label: 'Coupons', href: '/coupons', icon: Ticket },
  { label: 'Brands', href: '/brands', icon: Tag },
  { label: 'Payouts', href: '/payouts', icon: CreditCard },
  { label: 'Wallet transactions', href: '/wallet', icon: Wallet },
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
      q ? item.label.toLowerCase().includes(q) : true,
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
        <span className="flex-1 text-left text-text-muted">Search products, orders, pages…</span>
        <kbd className="rounded border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-text-muted hidden sm:inline">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Global search"
          className="absolute left-0 top-full z-50 mt-2 w-[360px] sm:w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface shadow-xl overflow-hidden"
        >
          <div className="flex items-center gap-2 border-b border-border bg-surface-muted/30 px-3 py-2.5">
            <Search size={16} className="text-text-muted shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a product name, SKU, order # or page…"
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
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors text-text-primary ${
                        active ? 'bg-primary-100 text-primary-900' : 'hover:bg-surface-muted'
                      }`}
                    >
                      <Icon size={16} className={`shrink-0 ${active ? 'text-primary-700' : 'text-text-muted'}`} />
                      <span className="flex-1 truncate">
                        Search <span className="font-semibold">{r.label}</span> for{' '}
                        <span className={active ? 'text-primary-800 font-medium' : 'text-primary-600'}>&ldquo;{r.query}&rdquo;</span>
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
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors text-text-primary ${
                      active ? 'bg-primary-100 text-primary-900 font-medium' : 'hover:bg-surface-muted'
                    }`}
                  >
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
