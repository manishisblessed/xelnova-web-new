'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import {
  Search, Package, Truck, CheckCircle2, Clock,
  ArrowRight, AlertCircle, Box,
  Loader2,
} from 'lucide-react';
import { ordersApi, setAccessToken, type Order } from '@xelnova/api';

function syncTokenFromCookie() {
  if (typeof document === 'undefined') return;
  const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
  if (m) setAccessToken(decodeURIComponent(m[1]));
}

type TrackingStep = {
  label: string;
  date: string;
  time: string;
  done: boolean;
  icon: typeof Box;
};

function formatDateTime(iso: string | undefined) {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  return {
    date: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

function statusHeadline(status: string) {
  const s = status.toUpperCase();
  const map: Record<string, string> = {
    PENDING: 'Order Received',
    PROCESSING: 'Processing',
    CONFIRMED: 'Confirmed',
    SHIPPED: 'In Transit',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    RETURNED: 'Returned',
    REFUNDED: 'Refunded',
  };
  return map[s] ?? s.replace(/_/g, ' ');
}

/** Max index (0..5) of the last completed step in the 6-step timeline */
function maxCompletedStepIndex(status: string): number {
  const s = status.toUpperCase();
  if (['CANCELLED', 'RETURNED', 'REFUNDED'].includes(s)) return -1;
  switch (s) {
    case 'PENDING': return 0;
    case 'PROCESSING': return 2;
    case 'CONFIRMED': return 2;
    case 'SHIPPED': return 4;
    case 'DELIVERED': return 5;
    default: return 0;
  }
}

function buildSteps(order: Order): TrackingStep[] {
  const created = formatDateTime(order.createdAt);
  const updated = formatDateTime(order.updatedAt ?? order.createdAt);
  const status = order.status.toUpperCase();
  const maxDone = maxCompletedStepIndex(status);

  const defs: { label: string; icon: typeof Box; timeIndex: 'created' | 'updated' }[] = [
    { label: 'Order Placed', icon: Box, timeIndex: 'created' },
    { label: 'Order Confirmed', icon: CheckCircle2, timeIndex: 'created' },
    { label: 'Processing', icon: Package, timeIndex: 'updated' },
    { label: 'Shipped', icon: Package, timeIndex: 'updated' },
    { label: 'In Transit', icon: Truck, timeIndex: 'updated' },
    { label: 'Delivered', icon: CheckCircle2, timeIndex: 'updated' },
  ];

  return defs.map((def, i) => {
    const t = def.timeIndex === 'created' ? created : updated;
    const done = maxDone >= i;
    return {
      label: def.label,
      date: done ? t.date : '',
      time: done ? t.time : '',
      done,
      icon: def.icon,
    };
  });
}

function itemLineName(item: Order['items'][number]) {
  return item.product?.name ?? item.productName;
}

function productSummary(order: Order) {
  if (!order.items?.length) return '';
  const first = itemLineName(order.items[0]);
  if (order.items.length === 1) return first;
  return `${first} +${order.items.length - 1} more`;
}

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [tracking, setTracking] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) {
      setError('Please enter an order ID');
      return;
    }
    setError('');
    setNotFound(false);
    setTracking(null);
    setLoading(true);
    syncTokenFromCookie();
    try {
      const order = await ordersApi.getOrderByNumber(orderId.trim());
      setTracking(order);
    } catch (e: unknown) {
      const err = e as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      const status = err.response?.status;
      if (status === 404) {
        setNotFound(true);
      } else if (status === 401) {
        setError(err.response?.data?.message ?? 'Sign in to track this order.');
      } else {
        setError(
          err.response?.data?.message ??
            err.message ??
            'Unable to load this order. Check the order number and try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const steps = tracking ? buildSteps(tracking) : [];
  const est = tracking?.estimatedDelivery
    ? new Date(tracking.estimatedDelivery).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  const terminal = tracking && ['CANCELLED', 'RETURNED', 'REFUNDED'].includes(tracking.status.toUpperCase());

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
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" />
                <input
                  type="text"
                  placeholder="Enter Order ID (e.g., XN-2026-000001)"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full bg-white/[0.07] border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-white/60 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-white text-primary-700 px-6 py-3.5 rounded-xl font-semibold text-sm hover:bg-primary-50 transition-all shadow-lg flex-shrink-0 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Track
              </button>
            </form>
            {error && <p className="text-danger-300 text-sm mt-3">{error}</p>}
            {notFound && (
              <p className="text-danger-300 text-sm mt-3" role="alert">
                Order not found. Check the ID or sign in to the account that placed it.
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Tracking Result */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          {tracking ? (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              {terminal && (
                <div className="mb-4 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800">
                  This order is {tracking.status.toLowerCase().replace(/_/g, ' ')}. Tracking steps below may not apply.
                </div>
              )}
              {/* Order Summary */}
              <div className="bg-white rounded-2xl border border-border/60 p-6 shadow-card mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-text-muted mb-1">Order ID</p>
                    <p className="font-bold text-text-primary font-display text-lg">{tracking.orderNumber}</p>
                    <p className="text-sm text-text-secondary mt-1">{productSummary(tracking)}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1.5 bg-info-50 text-info-600 px-3 py-1.5 rounded-full text-xs font-semibold">
                      <Truck size={12} /> {statusHeadline(tracking.status)}
                    </span>
                    <p className="text-xs text-text-muted mt-2 flex items-center gap-1 justify-end">
                      <Clock size={11} /> Est. delivery: {est}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-2xl border border-border/60 p-6 md:p-8 shadow-card">
                <h3 className="font-bold text-text-primary font-display mb-6">Delivery Progress</h3>
                <div className="space-y-0">
                  {steps.map((step, i) => (
                    <div key={step.label} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          step.done ? 'bg-primary-600 text-white' : 'bg-surface-muted text-text-muted'
                        }`}>
                          <step.icon size={18} />
                        </div>
                        {i < steps.length - 1 && (
                          <div className={`w-0.5 flex-1 my-1 min-h-[32px] ${
                            step.done && steps[i + 1]?.done ? 'bg-primary-400' : 'bg-border'
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
