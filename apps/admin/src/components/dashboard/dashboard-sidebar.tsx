'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  LogOut,
  Package,
  FolderTree,
  Tag,
  ShoppingCart,
  Users,
  Store,
  Image as ImageIcon,
  Zap,
  Ticket,
  TrendingUp,
  Percent,
  Wallet,
  FileCode,
  Shield,
  Settings,
  Activity,
  CheckCircle,
  MessageSquare,
  FileSpreadsheet,
  Copy,
  AlertTriangle,
  CreditCard,
  ShoppingBag,
  ShieldAlert,
  Flag,
  Star,
} from 'lucide-react';
import { cn } from '@xelnova/utils';
import { useDashboardAuth } from '@/lib/auth-context';

type NavItem = { href: string; label: string; icon: React.ComponentType<{ size?: number }> };
type NavSection = { title?: string; items: NavItem[] };

/** Ecommerce-first grouping: catalog, merchandising, and storefront content. */
const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/performance', label: 'Performance', icon: Activity },
      { href: '/logs', label: 'System Logs', icon: FileText },
      { href: '/verifications', label: 'Verifications', icon: CheckCircle },
      { href: '/feature-flags', label: 'Feature Flags', icon: Flag },
    ],
  },
  {
    title: 'Ecommerce',
    items: [
      { href: '/products', label: 'Products', icon: Package },
      { href: '/reviews', label: 'Reviews', icon: Star },
      { href: '/categories', label: 'Categories', icon: FolderTree },
      { href: '/brands', label: 'Brands', icon: Tag },
      { href: '/banners', label: 'Banners', icon: ImageIcon },
      { href: '/flash-deals', label: 'Flash Deals', icon: Zap },
      { href: '/coupons', label: 'Coupons', icon: Ticket },
      { href: '/pages', label: 'CMS Pages', icon: FileCode },
    ],
  },
  {
    title: 'Orders & users',
    items: [
      { href: '/orders', label: 'Orders', icon: ShoppingCart },
      { href: '/tickets', label: 'Support Tickets', icon: MessageSquare },
      { href: '/customers', label: 'Customers', icon: Users },
      { href: '/sellers', label: 'Sellers', icon: Store },
      { href: '/seller-onboarding', label: 'Seller Onboarding', icon: Store },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/revenue', label: 'Revenue', icon: TrendingUp },
      { href: '/commission', label: 'Commission', icon: Percent },
      { href: '/payouts', label: 'Payouts', icon: Wallet },
      { href: '/advance-payouts', label: 'Advance Payouts', icon: CreditCard },
      { href: '/wallets', label: 'Wallets', icon: Wallet },
      { href: '/reports', label: 'All Reports', icon: FileSpreadsheet },
    ],
  },
  {
    title: 'Risk & growth',
    items: [
      { href: '/duplicates', label: 'Duplicate Listings', icon: Copy },
      { href: '/pricing-flags', label: 'Pricing Flags', icon: AlertTriangle },
      { href: '/abandoned-carts', label: 'Abandoned Carts', icon: ShoppingBag },
      { href: '/fraud-flags', label: 'Fraud Detection', icon: ShieldAlert },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/roles', label: 'Roles', icon: Shield },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useDashboardAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex h-dvh w-64 flex-col overflow-hidden border-r border-border bg-surface">
      <div className="shrink-0 border-b border-border p-6">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image src="/xelnova-icon-dark.png" alt="Xelnova" width={36} height={36} className="h-8 w-8" />
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-bold text-primary-600 font-display">Xelnova</span>
            <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Admin</span>
          </div>
        </Link>
      </div>
      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden overscroll-y-contain p-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title ?? section.items[0]?.href ?? 'section'} className="space-y-0.5">
            {section.title ? (
              <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {section.title}
              </p>
            ) : null}
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
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
          </div>
        ))}
      </nav>
      <div className="shrink-0 space-y-0.5 border-t border-border bg-surface p-3">
        <div className="px-3 py-2 text-xs text-text-muted truncate" title={user?.email}>
          {user?.email}
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-50"
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  );
}
