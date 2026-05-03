'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Package, Store, CreditCard, LogOut, User, Truck, Wallet, MessageSquare, Upload, AlertTriangle, Tag, FileText, BarChart3, Palette, Ticket, Menu, X } from 'lucide-react';
import { cn } from '@xelnova/utils';
import { useDashboardAuth } from '@/lib/auth-context';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: Package },
  { href: '/inventory', label: 'Inventory', icon: Store },
  { href: '/store', label: 'Brand Store', icon: Palette },
  { href: '/bulk-upload', label: 'Bulk Upload', icon: Upload },
  { href: '/inventory-alerts', label: 'Stock Alerts', icon: AlertTriangle },
  { href: '/brands', label: 'Brands', icon: Tag },
  { href: '/coupons', label: 'Coupons', icon: Ticket },
  { href: '/payouts', label: 'Payouts', icon: CreditCard },
  { href: '/settlement', label: 'Settlement', icon: FileText },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/shipping', label: 'Shipping', icon: Truck },
  { href: '/tickets', label: 'Support Tickets', icon: MessageSquare },
  { href: '/profile', label: 'My Profile', icon: User },
];

/**
 * Responsive sidebar:
 *   • lg+ screens — fixed 256px column, always visible (existing layout).
 *   • <lg screens — slide-in drawer triggered by the floating menu button.
 *
 * Closes automatically when the route changes so the drawer doesn't linger
 * after a tap on a nav link.
 */
export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useDashboardAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock background scroll while the mobile drawer is open.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const sidebarContent = (
    <>
      <div className="shrink-0 p-6 border-b border-border flex items-center justify-between gap-3">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0" onClick={() => setOpen(false)}>
          <Image
            src="/xelnova-logo-dark.png"
            alt="Xelnova"
            width={160}
            height={40}
            className="h-7 w-auto max-w-[118px] shrink-0"
            priority
          />
          <div className="h-5 w-px bg-border shrink-0" aria-hidden />
          <span className="text-xs font-bold tracking-wide text-primary-600 uppercase shrink-0">Seller</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="lg:hidden -mr-2 rounded-lg p-1.5 text-text-muted hover:bg-surface-muted hover:text-text-primary"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
              <motion.span
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-primary-50 text-primary-700' : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
                )}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon size={18} />
                {item.label}
              </motion.span>
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 p-3 border-t border-border">
        <div className="px-3 py-2 text-xs text-text-muted truncate" title={user?.email}>{user?.email}</div>
        <button onClick={() => logout()} className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-danger-600 hover:bg-danger-50 transition-colors">
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Floating menu button — only on small screens */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-30 inline-flex items-center justify-center rounded-xl border border-border bg-surface p-2 shadow-sm text-text-primary hover:bg-surface-muted"
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 h-dvh w-64 flex-col overflow-hidden border-r border-border bg-surface">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/50"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[85vw] flex-col overflow-hidden border-r border-border bg-surface shadow-2xl"
              role="dialog"
              aria-modal="true"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
