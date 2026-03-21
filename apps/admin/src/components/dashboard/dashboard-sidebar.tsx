'use client';

import Link from 'next/link';
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
  Image,
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
} from 'lucide-react';
import { cn } from '@xelnova/utils';
import { useDashboardAuth } from '@/lib/auth-context';

const NAV: { href: string; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/performance', label: 'Performance', icon: Activity },
  { href: '/logs', label: 'System Logs', icon: FileText },
  { href: '/verifications', label: 'Verifications', icon: CheckCircle },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/categories', label: 'Categories', icon: FolderTree },
  { href: '/brands', label: 'Brands', icon: Tag },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/sellers', label: 'Sellers', icon: Store },
  { href: '/seller-onboarding', label: 'Seller Onboarding', icon: Store },
  { href: '/banners', label: 'Banners', icon: Image },
  { href: '/flash-deals', label: 'Flash Deals', icon: Zap },
  { href: '/coupons', label: 'Coupons', icon: Ticket },
  { href: '/revenue', label: 'Revenue', icon: TrendingUp },
  { href: '/commission', label: 'Commission', icon: Percent },
  { href: '/payouts', label: 'Payouts', icon: Wallet },
  { href: '/pages', label: 'CMS Pages', icon: FileCode },
  { href: '/roles', label: 'Roles', icon: Shield },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useDashboardAuth();

  return (
    <aside className="w-64 min-h-screen border-r border-border bg-surface flex flex-col">
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary-600 font-display">Xelnova</span>
          <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Admin</span>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
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
      </nav>
      <div className="p-3 border-t border-border">
        <div className="px-3 py-2 text-xs text-text-muted truncate" title={user?.email}>
          {user?.email}
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-danger-600 hover:bg-danger-50 transition-colors"
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  );
}
