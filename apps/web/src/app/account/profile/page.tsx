"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, MapPin, Camera, Shield, Package, Heart, LogOut } from "lucide-react";
import Link from "next/link";

const mockUser = { name: "Rahul Mehta", email: "rahul@example.com", phone: "+91 98765 43210", avatar: null };

const sideLinks = [
  { icon: Package, label: "My Orders", href: "/account/orders" },
  { icon: Heart, label: "Wishlist", href: "/account/wishlist" },
  { icon: MapPin, label: "Addresses", href: "#" },
  { icon: Shield, label: "Security", href: "#" },
];

export default function ProfilePage() {
  const [user, setUser] = useState(mockUser);

  return (
    <div className="min-h-screen bg-surface-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-white mb-8 font-display">My Account</h1>
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-surface-300/50 bg-surface-800 p-5">
              <div className="flex flex-col items-center text-center mb-5">
                <div className="relative mb-3">
                  <div className="h-20 w-20 rounded-full bg-gold-400/10 flex items-center justify-center border-2 border-gold-400/30">
                    <User size={32} className="text-gold-400" />
                  </div>
                  <button className="absolute -bottom-1 -right-1 rounded-full bg-gold-400 p-1.5 text-surface-950 hover:bg-gold-300 transition-colors"><Camera size={12} /></button>
                </div>
                <p className="font-semibold text-white">{user.name}</p>
                <p className="text-xs text-surface-100">{user.email}</p>
              </div>
              <nav className="space-y-1">
                {sideLinks.map((link) => (
                  <Link key={link.label} href={link.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-surface-100 hover:text-white hover:bg-surface-700 transition-colors">
                    <link.icon size={16} /> {link.label}
                  </Link>
                ))}
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-danger-400 hover:bg-danger-500/10 transition-colors">
                  <LogOut size={16} /> Sign Out
                </button>
              </nav>
            </div>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-3">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-surface-300/50 bg-surface-800 p-6">
              <h2 className="text-lg font-bold text-white mb-6">Personal Information</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-surface-50 mb-1.5">Full Name</label>
                  <div className="flex items-center rounded-xl border border-surface-300 bg-surface-700 overflow-hidden focus-within:border-gold-400 transition-colors">
                    <span className="px-3 text-surface-200"><User size={16} /></span>
                    <input type="text" value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} className="flex-1 bg-transparent px-1 py-3 text-sm text-white outline-none placeholder:text-surface-200" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-50 mb-1.5">Email</label>
                  <div className="flex items-center rounded-xl border border-surface-300 bg-surface-700 overflow-hidden focus-within:border-gold-400 transition-colors">
                    <span className="px-3 text-surface-200"><Mail size={16} /></span>
                    <input type="email" value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} className="flex-1 bg-transparent px-1 py-3 text-sm text-white outline-none placeholder:text-surface-200" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-50 mb-1.5">Phone Number</label>
                  <div className="flex items-center rounded-xl border border-surface-300 bg-surface-700 overflow-hidden focus-within:border-gold-400 transition-colors">
                    <span className="px-3 text-surface-200"><Phone size={16} /></span>
                    <input type="tel" value={user.phone} onChange={(e) => setUser({ ...user, phone: e.target.value })} className="flex-1 bg-transparent px-1 py-3 text-sm text-white outline-none placeholder:text-surface-200" />
                  </div>
                </div>
              </div>
              <button className="mt-6 rounded-xl bg-gold-400 px-6 py-3 text-sm font-semibold text-surface-950 hover:bg-gold-300 hover:shadow-glow-sm transition-all">Save Changes</button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
