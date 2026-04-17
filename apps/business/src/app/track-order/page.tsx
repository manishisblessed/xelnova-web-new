'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Package, Truck, CheckCircle2, Clock,
  ArrowRight, LogIn, ShoppingBag, User,
  Loader2,
} from 'lucide-react';
import { setAccessToken } from '@xelnova/api';

function isLoggedIn() {
  if (typeof document === 'undefined') return false;
  const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
  if (m) {
    setAccessToken(decodeURIComponent(m[1]));
    return true;
  }
  return false;
}

export default function TrackOrderPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const hasToken = isLoggedIn();
    setLoggedIn(hasToken);
    setChecking(false);

    if (hasToken) {
      router.push('/account/orders');
    }
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-sm text-text-muted">Redirecting to your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-0 left-1/3 w-80 h-80 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-60 h-60 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-white/70 mb-6">
              <Truck size={14} /> Order Tracking
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white font-display mb-4">Track Your Orders</h1>
            <p className="text-lg text-white/60 max-w-xl mx-auto mb-8">
              Sign in to your account to view all your orders and track their delivery status in real-time.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login?redirect=/account/orders"
                className="inline-flex items-center gap-2 bg-white text-primary-700 px-8 py-4 rounded-xl font-semibold text-sm hover:bg-primary-50 transition-all shadow-lg"
              >
                <LogIn size={18} />
                Sign In to Track Orders
              </Link>
              <Link
                href="/register?redirect=/account/orders"
                className="inline-flex items-center gap-2 bg-white/10 text-white px-8 py-4 rounded-xl font-semibold text-sm hover:bg-white/20 transition-all border border-white/20"
              >
                <User size={18} />
                Create Account
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-text-primary font-display mb-3">
                Why Sign In?
              </h2>
              <p className="text-text-muted">
                Get access to all your order information in one place
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-border/60 p-6 shadow-card text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary-50 flex items-center justify-center">
                  <ShoppingBag className="w-7 h-7 text-primary-600" />
                </div>
                <h3 className="font-semibold text-text-primary mb-2">All Orders</h3>
                <p className="text-sm text-text-muted">
                  View complete history of all your past and current orders
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-border/60 p-6 shadow-card text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-success-50 flex items-center justify-center">
                  <Truck className="w-7 h-7 text-success-600" />
                </div>
                <h3 className="font-semibold text-text-primary mb-2">Real-Time Tracking</h3>
                <p className="text-sm text-text-muted">
                  Track delivery status with live updates for each order
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-border/60 p-6 shadow-card text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <Clock className="w-7 h-7 text-amber-600" />
                </div>
                <h3 className="font-semibold text-text-primary mb-2">Quick Access</h3>
                <p className="text-sm text-text-muted">
                  Instantly access invoices, return requests, and more
                </p>
              </div>
            </div>
          </motion.div>

          {/* Timeline Preview */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-12"
          >
            <div className="bg-white rounded-2xl border border-border/60 p-8 shadow-card">
              <h3 className="font-bold text-text-primary font-display mb-6 text-center">
                Track Every Step of Your Delivery
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
                {[
                  { icon: Package, label: 'Order Placed', color: 'bg-primary-600' },
                  { icon: CheckCircle2, label: 'Confirmed', color: 'bg-primary-600' },
                  { icon: Package, label: 'Processing', color: 'bg-primary-400' },
                  { icon: Truck, label: 'Shipped', color: 'bg-gray-300' },
                  { icon: Truck, label: 'In Transit', color: 'bg-gray-300' },
                  { icon: CheckCircle2, label: 'Delivered', color: 'bg-gray-300' },
                ].map((step, i) => (
                  <div key={step.label} className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step.color} ${step.color === 'bg-gray-300' ? 'text-gray-500' : 'text-white'}`}>
                      <step.icon size={18} />
                    </div>
                    <span className={`text-xs font-medium ${step.color === 'bg-gray-300' ? 'text-text-muted' : 'text-text-primary'}`}>
                      {step.label}
                    </span>
                    {i < 5 && (
                      <div className="hidden md:block w-8 h-0.5 bg-gray-200 ml-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-12"
          >
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-center text-white">
              <h3 className="text-xl font-bold mb-3">Ready to Track Your Orders?</h3>
              <p className="text-white/70 mb-6 max-w-md mx-auto">
                Sign in now to view your order history and track all your deliveries in real-time.
              </p>
              <Link 
                href="/login?redirect=/account/orders" 
                className="inline-flex items-center gap-2 bg-white text-primary-700 px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-primary-50 transition-all shadow-lg"
              >
                Sign In Now <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
