'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Award,
  ShoppingCart,
  Users,
  Store,
  BarChart3,
  CreditCard,
  Ticket,
  Image as ImageIcon,
  Zap,
  FileText,
  Settings,
  Shield,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'General',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
      { label: 'Orders', href: '/orders', icon: ShoppingCart, badge: 2, badgeColor: 'bg-primary-500' },
      { label: 'Products', href: '/products', icon: Package },
      { label: 'Customers', href: '/customers', icon: Users, badge: 4, badgeColor: 'bg-primary-500' },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { label: 'Categories', href: '/categories', icon: FolderTree },
      { label: 'Brands', href: '/brands', icon: Award },
      { label: 'Sellers', href: '/sellers', icon: Store },
    ],
  },
  {
    title: 'Analytics & Tools',
    items: [
      { label: 'Analytics', href: '/revenue', icon: BarChart3 },
      { label: 'Payouts', href: '/payouts', icon: CreditCard, badge: 2, badgeColor: 'bg-rose-500' },
      { label: 'Coupons', href: '/coupons', icon: Ticket },
      { label: 'Banners', href: '/banners', icon: ImageIcon },
      { label: 'Flash Deals', href: '/flash-deals', icon: Zap },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Pages', href: '/pages', icon: FileText },
      { label: 'Settings', href: '/settings', icon: Settings },
      { label: 'Roles', href: '/roles', icon: Shield },
    ],
  },
];

function SidebarTooltip({
  children,
  label,
  show,
}: {
  children: React.ReactNode;
  label: string;
  show: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  if (!show) return <>{children}</>;
  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-heading shadow-dropdown"
          >
            {label}
            <div className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-l border-b border-border bg-card" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '[' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const prevPathRef = useRef(pathname);
  useEffect(() => {
    if (prevPathRef.current !== pathname && mobileOpen) onClose?.();
    prevPathRef.current = pathname;
  }, [pathname, mobileOpen, onClose]);

  const sidebarContent = (
    <>
      {/* Logo + Collapse */}
      <div
        className={`flex h-16 items-center justify-between border-b border-sidebar-border ${collapsed ? 'px-4' : 'px-5'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-sm">
            <span className="text-sm font-bold text-white font-display">X</span>
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[15px] font-semibold text-heading font-display truncate"
            >
              Xelnova
            </motion.span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-muted transition-colors duration-200 hover:bg-sidebar-hover hover:text-heading active:scale-95"
          >
            <ChevronsLeft size={16} />
          </button>
        )}
      </div>

      {/* Store Selector */}
      <div className={`px-3 py-3 ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed && (
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-subtle">
            Store
          </p>
        )}
        <SidebarTooltip label="Xelnova Store" show={collapsed}>
          <button
            type="button"
            className={`flex w-full items-center gap-2.5 rounded-xl transition-colors duration-200 hover:bg-sidebar-hover active:scale-[0.99] ${
              collapsed ? 'h-10 w-10 justify-center p-0' : 'px-3 py-2.5'
            }`}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-500 text-[11px] font-bold text-white">
              X
            </div>
            {!collapsed && (
              <>
                <span className="flex-1 truncate text-left text-[13px] font-medium text-heading">
                  Xelnova Store
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  className="shrink-0 text-sidebar-muted"
                >
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </>
            )}
          </button>
        </SidebarTooltip>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {navSections.map((section, sIdx) => (
          <div key={section.title} className={sIdx > 0 ? 'mt-5' : ''}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                {section.title}
              </p>
            )}
            {collapsed && sIdx > 0 && (
              <div className="mx-auto mb-3 mt-1 h-px w-6 bg-sidebar-border" />
            )}
            <ul className="space-y-0.5">
              {section.items.map((navItem) => {
                const isActive =
                  navItem.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(navItem.href);
                const Icon = navItem.icon;
                return (
                  <li key={navItem.href}>
                    <SidebarTooltip label={navItem.label} show={collapsed}>
                      <Link
                        href={navItem.href}
                        onClick={onClose}
                        className={`group relative flex items-center rounded-xl transition-all duration-200 ease-out ${
                          collapsed
                            ? 'mx-auto h-10 w-10 justify-center'
                            : `gap-3 py-2.5 ${isActive ? 'pl-4 pr-3' : 'px-3'}`
                        } ${
                          isActive
                            ? 'bg-sidebar-active text-primary-700'
                            : 'text-sidebar-text hover:bg-sidebar-hover hover:text-heading active:scale-[0.98]'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="sidebar-active"
                            transition={{
                              type: 'spring',
                              stiffness: 380,
                              damping: 30,
                            }}
                            className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary-500"
                          />
                        )}
                        <div className="relative shrink-0">
                          <Icon
                            size={20}
                            strokeWidth={isActive ? 2 : 1.6}
                            className={
                              isActive
                                ? 'text-primary-600'
                                : 'text-sidebar-muted group-hover:text-heading'
                            }
                          />
                          {collapsed && navItem.badge != null && (
                            <span
                              className={`absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white ${navItem.badgeColor}`}
                            >
                              {navItem.badge}
                            </span>
                          )}
                        </div>
                        {!collapsed && (
                          <span className="flex-1 truncate text-[13.5px] font-medium">
                            {navItem.label}
                          </span>
                        )}
                        {!collapsed && navItem.badge != null && (
                          <span
                            className={`flex h-5 min-w-[20px] items-center justify-center rounded-md px-1.5 text-[10px] font-bold text-white ${navItem.badgeColor}`}
                          >
                            {navItem.badge}
                          </span>
                        )}
                      </Link>
                    </SidebarTooltip>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse button (when collapsed) */}
      {collapsed && (
        <div className="flex justify-center border-t border-sidebar-border py-3">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-sidebar-muted transition-colors duration-200 hover:bg-sidebar-hover hover:text-heading active:scale-95"
          >
            <ChevronsRight size={18} />
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 250 }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] as const }}
        className="relative hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex"
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r border-sidebar-border bg-sidebar shadow-xl lg:hidden"
          >
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600">
                  <span className="text-sm font-bold text-white font-display">X</span>
                </div>
                <span className="text-[15px] font-semibold text-heading font-display">
                  Xelnova
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-muted hover:bg-sidebar-hover hover:text-heading"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {navSections.map((section, sIdx) => (
                <div key={section.title} className={sIdx > 0 ? 'mt-5' : ''}>
                  <p className="mb-2 px-5 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                    {section.title}
                  </p>
                  <ul className="space-y-0.5 px-3">
                    {section.items.map((navItem) => {
                      const isActive =
                        navItem.href === '/'
                          ? pathname === '/'
                          : pathname.startsWith(navItem.href);
                      const Icon = navItem.icon;
                      return (
                        <li key={navItem.href}>
                          <Link
                            href={navItem.href}
                            onClick={onClose}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                              isActive
                                ? 'bg-sidebar-active text-primary-700'
                                : 'text-sidebar-text hover:bg-sidebar-hover hover:text-heading'
                            }`}
                          >
                            <Icon
                              size={20}
                              strokeWidth={isActive ? 2 : 1.6}
                              className={isActive ? 'text-primary-600' : 'text-sidebar-muted'}
                            />
                            {navItem.label}
                            {navItem.badge != null && (
                              <span
                                className={`ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-md px-1.5 text-[10px] font-bold text-white ${navItem.badgeColor}`}
                              >
                                {navItem.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
