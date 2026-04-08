'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Package, Store, CreditCard, LogOut, User, Truck, Wallet, MessageSquare, Upload, AlertTriangle, Tag, FileText, BarChart3 } from 'lucide-react';
import { cn } from '@xelnova/utils';
import { useDashboardAuth } from '@/lib/auth-context';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: Package },
  { href: '/inventory', label: 'Inventory', icon: Store },
  { href: '/bulk-upload', label: 'Bulk Upload', icon: Upload },
  { href: '/inventory-alerts', label: 'Stock Alerts', icon: AlertTriangle },
  { href: '/brands', label: 'Brands', icon: Tag },
  { href: '/payouts', label: 'Payouts', icon: CreditCard },
  { href: '/settlement', label: 'Settlement', icon: FileText },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/shipping', label: 'Shipping', icon: Truck },
  { href: '/tickets', label: 'Support Tickets', icon: MessageSquare },
  { href: '/profile', label: 'My Profile', icon: User },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useDashboardAuth();

  return (
    <aside className="w-64 min-h-screen border-r border-border bg-surface flex flex-col">
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
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
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
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
        <div className="px-3 py-2 text-xs text-text-muted truncate" title={user?.email}>{user?.email}</div>
        <button onClick={() => logout()} className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-danger-600 hover:bg-danger-50 transition-colors">
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  );
}
