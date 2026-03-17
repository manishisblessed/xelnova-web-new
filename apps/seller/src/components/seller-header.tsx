"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Search,
  Menu,
} from "lucide-react";
import { sellerProfile } from "@/lib/mock-data";

interface SellerHeaderProps {
  onMenuClick?: () => void;
}

export default function SellerHeader({ onMenuClick }: SellerHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, text: "New order #ORD-10237 received", time: "2 min ago", unread: true },
    { id: 2, text: "Product 'boAt Rockerz 450' stock low (< 50)", time: "1 hour ago", unread: true },
    { id: 3, text: "Payout of ₹1,50,000 processed", time: "3 hours ago", unread: false },
    { id: 4, text: "Order #ORD-10234 delivered successfully", time: "5 hours ago", unread: false },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm shadow-soft">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-sidebar-hover hover:text-heading lg:hidden"
          >
            <Menu size={20} />
          </button>
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="text"
              placeholder="Search orders, products..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-page border border-border text-sm text-heading placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="relative p-2.5 rounded-xl hover:bg-sidebar-hover transition-colors text-muted hover:text-heading"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-primary-500 rounded-full text-[10px] font-semibold text-white flex items-center justify-center shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          <div className="w-px h-8 bg-border mx-1" />

          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-3 p-1.5 pr-2.5 rounded-xl hover:bg-sidebar-hover transition-colors"
            >
              <img
                src={sellerProfile.avatar}
                alt={sellerProfile.name}
                className="w-9 h-9 rounded-full ring-2 ring-border"
              />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-heading leading-tight">
                  {sellerProfile.storeName}
                </p>
                <p className="text-xs text-muted">{sellerProfile.name}</p>
              </div>
              <ChevronDown size={16} className="text-muted shrink-0" />
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-card rounded-2xl shadow-card border border-border overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-sm font-semibold text-heading">Notifications</span>
                    <button className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`px-4 py-3 border-b border-border hover:bg-sidebar-hover transition-colors ${
                          notif.unread ? "bg-primary-50/50" : ""
                        }`}
                      >
                        <p className="text-sm text-body">{notif.text}</p>
                        <span className="text-xs text-muted mt-1 block">{notif.time}</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t border-border text-center">
                    <button className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                      View all
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-card rounded-2xl shadow-card border border-border overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-heading">{sellerProfile.storeName}</p>
                    <p className="text-xs text-muted mt-0.5">{sellerProfile.email}</p>
                  </div>
                  <div className="py-1.5">
                    <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-body hover:bg-sidebar-hover hover:text-heading transition-colors">
                      <User size={16} /> Profile
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-body hover:bg-sidebar-hover hover:text-heading transition-colors">
                      <Settings size={16} /> Store Settings
                    </button>
                  </div>
                  <div className="border-t border-border py-1.5">
                    <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger-500 hover:bg-danger-50 transition-colors">
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
