'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import {
  Search, Package, Truck, CheckCircle2, Clock,
  MapPin, ArrowRight, AlertCircle, Box,
} from 'lucide-react';

const sampleTracking = {
  orderId: 'XLN-2026031201',
  status: 'In Transit',
  estimatedDelivery: 'March 15, 2026',
  product: 'Sony WH-1000XM5 Wireless Headphones',
  steps: [
    { label: 'Order Placed', date: 'March 10, 2026', time: '2:30 PM', done: true, icon: Box },
    { label: 'Order Confirmed', date: 'March 10, 2026', time: '2:35 PM', done: true, icon: CheckCircle2 },
    { label: 'Shipped', date: 'March 11, 2026', time: '10:15 AM', done: true, icon: Package },
    { label: 'In Transit', date: 'March 12, 2026', time: '8:00 AM', done: true, icon: Truck },
    { label: 'Out for Delivery', date: '', time: '', done: false, icon: MapPin },
    { label: 'Delivered', date: '', time: '', done: false, icon: CheckCircle2 },
  ],
};

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [tracking, setTracking] = useState<typeof sampleTracking | null>(null);
  const [error, setError] = useState('');

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) {
      setError('Please enter an order ID');
      return;
    }
    setError('');
    setTracking(sampleTracking);
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-0 left-1/3 w-80 h-80 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-medium text-white/70 mb-6">
              <Truck size={14} /> Order Tracking
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white font-display mb-4">Track Your Order</h1>
            <p className="text-lg text-white/60 max-w-xl mx-auto mb-8">Enter your order ID to see real-time delivery status.</p>

            <form onSubmit={handleTrack} className="max-w-lg mx-auto flex gap-2">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder="Enter Order ID (e.g., XLN-2026031201)"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full bg-white/[0.07] border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                />
              </div>
              <button type="submit" className="bg-white text-primary-700 px-6 py-3.5 rounded-xl font-semibold text-sm hover:bg-primary-50 transition-all shadow-lg flex-shrink-0">
                Track
              </button>
            </form>
            {error && <p className="text-danger-300 text-sm mt-3">{error}</p>}
          </motion.div>
        </div>
      </section>

      {/* Tracking Result */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          {tracking ? (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              {/* Order Summary */}
              <div className="bg-white rounded-2xl border border-border/60 p-6 shadow-card mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-text-muted mb-1">Order ID</p>
                    <p className="font-bold text-text-primary font-display text-lg">{tracking.orderId}</p>
                    <p className="text-sm text-text-secondary mt-1">{tracking.product}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1.5 bg-info-50 text-info-600 px-3 py-1.5 rounded-full text-xs font-semibold">
                      <Truck size={12} /> {tracking.status}
                    </span>
                    <p className="text-xs text-text-muted mt-2 flex items-center gap-1 justify-end">
                      <Clock size={11} /> Est. delivery: {tracking.estimatedDelivery}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-2xl border border-border/60 p-6 md:p-8 shadow-card">
                <h3 className="font-bold text-text-primary font-display mb-6">Delivery Progress</h3>
                <div className="space-y-0">
                  {tracking.steps.map((step, i) => (
                    <div key={step.label} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          step.done ? 'bg-primary-600 text-white' : 'bg-surface-muted text-text-muted'
                        }`}>
                          <step.icon size={18} />
                        </div>
                        {i < tracking.steps.length - 1 && (
                          <div className={`w-0.5 flex-1 my-1 min-h-[32px] ${
                            step.done && tracking.steps[i + 1]?.done ? 'bg-primary-400' : 'bg-border'
                          }`} />
                        )}
                      </div>
                      <div className="pb-6">
                        <p className={`font-medium ${step.done ? 'text-text-primary' : 'text-text-muted'}`}>{step.label}</p>
                        {step.date && (
                          <p className="text-xs text-text-muted mt-0.5">{step.date} at {step.time}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="bg-white rounded-2xl border border-border/60 p-12 shadow-card text-center">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-surface-muted flex items-center justify-center">
                  <Package className="w-8 h-8 text-text-muted" />
                </div>
                <h3 className="text-xl font-bold text-text-primary font-display mb-2">Track Your Delivery</h3>
                <p className="text-sm text-text-muted mb-6">Enter your order ID above to see real-time tracking information.</p>
                <div className="flex items-center justify-center gap-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1"><AlertCircle size={12} /> Find your order ID in your confirmation email</span>
                </div>
              </div>

              <div className="mt-8 bg-surface-muted rounded-2xl p-8 text-center">
                <p className="text-sm text-text-muted mb-4">Already signed in? View all your orders in one place.</p>
                <Link href="/account/orders" className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all shadow-primary">
                  Go to My Orders <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
