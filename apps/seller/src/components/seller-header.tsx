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
} from "lucide-react";
import { sellerProfile } from "@/lib/mock-data";

export default function SellerHeader() {
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
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-warm-200 shadow-soft">
      <div className="flex items-center justify-between h-16 px-6 gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search orders, products..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="relative p-2.5 rounded-xl hover:bg-warm-200 transition-colors text-slate-500 hover:text-slate-700"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-amber-500 rounded-full text-[10px] font-semibold text-white flex items-center justify-center shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          <div className="w-px h-8 bg-warm-200 mx-1" />

          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-3 p-1.5 pr-2.5 rounded-xl hover:bg-warm-200 transition-colors"
            >
              <img
                src={sellerProfile.avatar}
                alt={sellerProfile.name}
                className="w-9 h-9 rounded-full ring-2 ring-warm-200"
              />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-slate-800 leading-tight">
                  {sellerProfile.storeName}
                </p>
                <p className="text-xs text-slate-500">{sellerProfile.name}</p>
              </div>
              <ChevronDown size={16} className="text-slate-400 shrink-0" />
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-card border border-warm-200 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-warm-200">
                    <span className="text-sm font-semibold text-slate-800">Notifications</span>
                    <button className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`px-4 py-3 border-b border-warm-100 hover:bg-warm-50 transition-colors ${
                          notif.unread ? "bg-amber-50/50" : ""
                        }`}
                      >
                        <p className="text-sm text-slate-700">{notif.text}</p>
                        <span className="text-xs text-slate-400 mt-1 block">{notif.time}</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t border-warm-200 text-center">
                    <button className="text-xs text-amber-600 hover:text-amber-700 font-medium">
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
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-card border border-warm-200 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-warm-200">
                    <p className="text-sm font-semibold text-slate-800">{sellerProfile.storeName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{sellerProfile.email}</p>
                  </div>
                  <div className="py-1.5">
                    <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-warm-100 hover:text-slate-900 transition-colors">
                      <User size={16} /> Profile
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-warm-100 hover:text-slate-900 transition-colors">
                      <Settings size={16} /> Store Settings
                    </button>
                  </div>
                  <div className="border-t border-warm-200 py-1.5">
                    <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors">
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
