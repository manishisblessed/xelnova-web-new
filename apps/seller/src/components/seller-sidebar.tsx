"use client";

import { useState } from "react";
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
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  color: string; // bg + text class for icon blob
  children?: { label: string; href: string; icon: React.ReactNode }[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: <LayoutDashboard size={20} />, color: "bg-amber-100 text-amber-600" },
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
  { label: "Revenue", href: "/revenue", icon: <DollarSign size={20} />, color: "bg-amber-100 text-amber-600" },
  { label: "Store Settings", href: "/settings", icon: <Settings size={20} />, color: "bg-slate-100 text-slate-600" },
  { label: "Brand Management", href: "/brand", icon: <Palette size={20} />, color: "bg-fuchsia-100 text-fuchsia-600" },
];

export default function SellerSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Products"]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="fixed left-0 top-0 h-screen bg-white z-40 flex flex-col border-r border-warm-200 shadow-soft"
    >
      <div className="flex items-center justify-between px-4 h-16 border-b border-warm-200 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0 bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm">
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
                <span className="text-slate-800 font-semibold text-[15px] tracking-tight">Xelnova</span>
                <span className="text-amber-600 text-xs ml-1.5 font-medium">Seller</span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex-shrink-0 text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-lg hover:bg-warm-200"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const expanded = expandedItems.includes(item.label);
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.label}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(item.label)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                    active
                      ? "bg-amber-50 text-amber-700"
                      : "text-slate-600 hover:text-slate-900 hover:bg-warm-200/80"
                  }`}
                >
                  <span className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${active ? "bg-amber-100" : item.color}`}>
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
                      className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${
                        expanded ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                    active
                      ? "bg-amber-50 text-amber-700"
                      : "text-slate-600 hover:text-slate-900 hover:bg-warm-200/80"
                  }`}
                >
                  <span className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${active ? "bg-amber-100 text-amber-600" : item.color}`}>
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
                      layoutId="activeIndicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-amber-500"
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
                    <div className="ml-4 pl-5 border-l-2 border-warm-200 mt-1 mb-1 space-y-0.5">
                      {item.children!.map((child) => {
                        const childActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                              childActive
                                ? "text-amber-700 bg-amber-50 font-medium"
                                : "text-slate-500 hover:text-slate-800 hover:bg-warm-200/60"
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

      {!collapsed && (
        <div className="p-4 mx-3 mb-4 mt-2 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles size={14} className="text-amber-600" />
            <span className="text-xs font-semibold text-slate-800">Seller Pro</span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed mb-3">
            Get deeper analytics, priority support & more.
          </p>
          <button className="w-full py-2 rounded-xl text-xs font-medium bg-amber-400 text-white hover:bg-amber-500 transition-colors shadow-soft">
            Upgrade
          </button>
        </div>
      )}
    </motion.aside>
  );
}
