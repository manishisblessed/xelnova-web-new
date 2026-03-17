"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Warehouse,
  BarChart3,
  DollarSign,
  Settings,
  Palette,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  List,
  Sparkles,
  X,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  children?: { label: string; href: string; icon: React.ReactNode }[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: <LayoutDashboard size={20} />, color: "bg-primary-100 text-primary-600" },
  {
    label: "Products",
    href: "/products",
    icon: <Package size={20} />,
    color: "bg-sky-100 text-sky-600",
    children: [
      { label: "All Products", href: "/products", icon: <List size={16} /> },
      { label: "Add Product", href: "/products/add", icon: <Plus size={16} /> },
    ],
  },
  { label: "Orders", href: "/orders", icon: <ShoppingCart size={20} />, color: "bg-emerald-100 text-emerald-600" },
  { label: "Inventory", href: "/inventory", icon: <Warehouse size={20} />, color: "bg-violet-100 text-violet-600" },
  { label: "Analytics", href: "/analytics", icon: <BarChart3 size={20} />, color: "bg-rose-100 text-rose-600" },
  { label: "Revenue", href: "/revenue", icon: <DollarSign size={20} />, color: "bg-primary-100 text-primary-600" },
  { label: "Settings", href: "/settings", icon: <Settings size={20} />, color: "bg-slate-100 text-slate-600" },
  { label: "Brand", href: "/brand", icon: <Palette size={20} />, color: "bg-fuchsia-100 text-fuchsia-600" },
];

interface SellerSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function SellerSidebar({ mobileOpen = false, onClose }: SellerSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Products"]);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (prevPathRef.current !== pathname && mobileOpen) onClose?.();
    prevPathRef.current = pathname;
  }, [pathname, mobileOpen, onClose]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const navContent = (
    <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
      {navItems.map((item) => {
        const active = isActive(item.href);
        const expanded = expandedItems.includes(item.label);
        const hasChildren = item.children && item.children.length > 0;

        return (
          <div key={item.label}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(item.label)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-sidebar-active text-primary-700"
                    : "text-sidebar-text hover:text-heading hover:bg-sidebar-hover"
                }`}
              >
                <span className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${active ? "bg-primary-100 text-primary-600" : item.color}`}>
                  {item.icon}
                </span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 text-left text-sm font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!collapsed && (
                  <ChevronDown
                    size={14}
                    className={`flex-shrink-0 text-sidebar-muted transition-transform duration-200 ${
                      expanded ? "rotate-180" : ""
                    }`}
                  />
                )}
              </button>
            ) : (
              <Link
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative ${
                  active
                    ? "bg-sidebar-active text-primary-700"
                    : "text-sidebar-text hover:text-heading hover:bg-sidebar-hover"
                }`}
              >
                <span className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${active ? "bg-primary-100 text-primary-600" : item.color}`}>
                  {item.icon}
                </span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {active && (
                  <motion.div
                    layoutId="seller-activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-primary-500"
                  />
                )}
              </Link>
            )}

            <AnimatePresence>
              {hasChildren && expanded && !collapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="ml-4 pl-5 border-l-2 border-sidebar-border mt-1 mb-1 space-y-0.5">
                    {item.children!.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                            childActive
                              ? "text-primary-700 bg-sidebar-active font-medium"
                              : "text-sidebar-text hover:text-heading hover:bg-sidebar-hover"
                          }`}
                        >
                          {child.icon}
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar - in flow */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 250 }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        className="hidden lg:flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border shrink-0">
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0 bg-gradient-to-br from-primary-500 to-primary-600 shadow-sm">
              X
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <span className="text-heading font-semibold text-[15px] tracking-tight">Xelnova</span>
                  <span className="text-primary-600 text-xs ml-1.5 font-medium">Seller</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex-shrink-0 text-sidebar-muted hover:text-heading transition-colors p-2 rounded-lg hover:bg-sidebar-hover"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        {navContent}
        {!collapsed && (
          <div className="p-4 mx-3 mb-4 mt-2 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100/50 border border-primary-200/60">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={14} className="text-primary-600" />
              <span className="text-xs font-semibold text-heading">Seller Pro</span>
            </div>
            <p className="text-body text-[11px] leading-relaxed mb-3">
              Get deeper analytics, priority support & more.
            </p>
            <button
              type="button"
              className="w-full py-2 rounded-xl text-xs font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-soft"
            >
              Upgrade
            </button>
          </div>
        )}
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r border-sidebar-border bg-sidebar shadow-xl lg:hidden"
          >
            <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm bg-gradient-to-br from-primary-500 to-primary-600">
                  X
                </div>
                <span className="text-heading font-semibold text-[15px]">Xelnova Seller</span>
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
              {navItems.map((item) => {
                if (item.children?.length) {
                  return (
                    <div key={item.label} className="px-3 space-y-0.5">
                      <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                        {item.label}
                      </p>
                      {item.children.map((child) => {
                        const childActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onClose}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm ${
                              childActive ? "bg-sidebar-active text-primary-700 font-medium" : "text-sidebar-text hover:bg-sidebar-hover"
                            }`}
                          >
                            {child.icon}
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  );
                }
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-5 py-2.5 rounded-xl text-sm font-medium ${
                      active ? "bg-sidebar-active text-primary-700" : "text-sidebar-text hover:bg-sidebar-hover"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
