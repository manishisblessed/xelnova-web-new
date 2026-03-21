'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Package, Store, CreditCard, LogOut, User, BarChart3, Settings } from 'lucide-react';
import { cn } from '@xelnova/utils';
import { useDashboardAuth } from '@/lib/auth-context';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: Package },
  { href: '/inventory', label: 'Inventory', icon: Store },
  { href: '/payouts', label: 'Payouts', icon: CreditCard },
  { href: '/profile', label: 'My Profile', icon: User },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useDashboardAuth();

  return (
    <aside className="w-64 min-h-screen border-r border-border bg-surface flex flex-col">
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary-600 font-display">Xelnova</span>
          <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Seller</span>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href;
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
        <div className="px-3 py-2 text-xs text-text-muted truncate" title={user?.email}>{user?.email}</div>
        <button onClick={() => logout()} className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-danger-600 hover:bg-danger-50 transition-colors">
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  );
}
