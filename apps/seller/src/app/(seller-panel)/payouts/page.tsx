'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  IndianRupee, Wallet, Percent, ShoppingCart, Package,
  TrendingUp, ArrowUpRight, ArrowDownRight, Calendar,
  CheckCircle, Clock, AlertCircle, Banknote, PiggyBank,
  Download, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StatCard } from '@/components/dashboard/stat-card';
const ChartCard = dynamic(() => import('@/components/dashboard/chart-card').then((m) => m.ChartCard), { ssr: false, loading: () => <div className="rounded-2xl border border-border bg-surface p-6 shadow-card h-[280px] flex items-center justify-center"><div className="w-full h-full max-w-[400px] rounded-xl bg-surface-muted animate-pulse" /></div> });
import { Badge } from '@xelnova/ui';
import { apiGetRevenue, apiGetOrders } from '@/lib/api';

interface RevenueResponse {
  totalRevenue: number;
  netRevenue: number;
  commission: number;
  commissionRate: number;
  totalOrders: number;
  totalUnits?: number;
  dailyRevenue: { date: string; amount: number }[];
}

interface SimpleOrder {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: { price: number; quantity: number }[];
}

function fmt(n: number) {
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function normalizeOrders(res: unknown): SimpleOrder[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object' && 'items' in res) return (res as { items: SimpleOrder[] }).items;
  return [];
}

type PayoutCycle = {
  id: string;
  period: string;
  grossSales: number;
  commission: number;
  netPayout: number;
  orders: number;
  status: 'paid' | 'processing' | 'upcoming';
  date: string;
};

export default function SellerPayoutsPage() {
  const [data, setData] = useState<RevenueResponse | null>(null);
  const [orders, setOrders] = useState<SimpleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  useEffect(() => {
    let cancelled = false;

    Promise.all([apiGetRevenue(), apiGetOrders()])
      .then(([rev, ord]) => {
        if (cancelled) return;
        setData(rev as RevenueResponse);
        setOrders(normalizeOrders(ord));
      })
      .catch((err: Error) => toast.error(err.message || 'Failed to load payout data'))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const chartData = data?.dailyRevenue?.map((d) => ({ name: d.date.slice(5), value: d.amount })) ?? [];

  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');
  const pendingSettlement = orders.filter((o) => ['SHIPPED', 'PROCESSING', 'CONFIRMED'].includes(o.status));
  const deliveredTotal = deliveredOrders.reduce((s, o) => s + o.total, 0);
  const pendingTotal = pendingSettlement.reduce((s, o) => s + o.total, 0);

  const commRate = data?.commissionRate ?? 10;
  const deliveredNet = deliveredTotal - (deliveredTotal * commRate / 100);
  const pendingNet = pendingTotal - (pendingTotal * commRate / 100);

  const payoutCycles: PayoutCycle[] = buildPayoutCycles(deliveredOrders, commRate);

  return (
    <>
      <DashboardHeader title="Payouts & Settlements" />
      <div className="p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-muted">Available Balance</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-1">{loading ? '—' : fmt(deliveredNet)}</p>
                  <p className="text-xs text-text-muted mt-1">From {deliveredOrders.length} delivered orders</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-2.5">
                  <Wallet size={20} className="text-emerald-600" />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-muted">Pending Settlement</p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">{loading ? '—' : fmt(pendingNet)}</p>
                  <p className="text-xs text-text-muted mt-1">From {pendingSettlement.length} in-transit orders</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-2.5">
                  <Clock size={20} className="text-amber-600" />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-muted">Total Earnings</p>
                  <p className="text-3xl font-bold text-text-primary mt-1">{loading ? '—' : fmt(data?.netRevenue ?? 0)}</p>
                  <p className="text-xs text-text-muted mt-1">After {commRate}% platform commission</p>
                </div>
                <div className="rounded-xl bg-blue-50 p-2.5">
                  <IndianRupee size={20} className="text-blue-600" />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-muted">Platform Commission</p>
                  <p className="text-3xl font-bold text-red-500 mt-1">{loading ? '—' : fmt(data?.commission ?? 0)}</p>
                  <p className="text-xs text-text-muted mt-1">{commRate}% of gross sales</p>
                </div>
                <div className="rounded-xl bg-red-50 p-2.5">
                  <Percent size={20} className="text-red-500" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Revenue chart + Breakdown */}
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartCard title="Daily Revenue Trend" data={chartData} loading={loading} />
          </div>

          {/* Earnings breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="rounded-2xl border border-border bg-white p-5 shadow-sm"
          >
            <h3 className="text-sm font-bold text-text-primary mb-4">Earnings Breakdown</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-muted">Gross Sales</span>
                  <span className="font-semibold text-text-primary">{fmt(data?.totalRevenue ?? 0)}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-muted">Commission ({commRate}%)</span>
                  <span className="font-semibold text-red-500">-{fmt(data?.commission ?? 0)}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full" style={{ width: `${commRate}%` }} />
                </div>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-text-primary">Net Earnings</span>
                  <span className="font-bold text-emerald-600">{fmt(data?.netRevenue ?? 0)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted flex items-center gap-1.5"><ShoppingCart size={13} /> Orders</span>
                  <span className="font-medium text-text-primary">{data?.totalOrders ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted flex items-center gap-1.5"><Package size={13} /> Units sold</span>
                  <span className="font-medium text-text-primary">{data?.totalUnits ?? 0}</span>
                </div>
                {(data?.totalOrders ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted flex items-center gap-1.5"><TrendingUp size={13} /> Avg. order value</span>
                    <span className="font-medium text-text-primary">{fmt((data?.totalRevenue ?? 0) / (data?.totalOrders || 1))}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Payout cycles */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-border bg-white shadow-sm"
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary">Settlement History</h3>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Banknote size={14} />
              Payouts are settled after order delivery
            </div>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : payoutCycles.length === 0 ? (
            <div className="py-12 text-center">
              <PiggyBank size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-text-muted text-sm">No settlement history yet</p>
              <p className="text-text-muted text-xs mt-1">Settlements appear after orders are delivered</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {payoutCycles.map((cycle) => (
                <div key={cycle.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg p-2 ${
                      cycle.status === 'paid' ? 'bg-emerald-50' : cycle.status === 'processing' ? 'bg-amber-50' : 'bg-gray-50'
                    }`}>
                      {cycle.status === 'paid' ? (
                        <CheckCircle size={18} className="text-emerald-600" />
                      ) : cycle.status === 'processing' ? (
                        <Clock size={18} className="text-amber-600" />
                      ) : (
                        <Calendar size={18} className="text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{cycle.period}</p>
                      <p className="text-xs text-text-muted">{cycle.orders} orders · {cycle.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold text-text-primary">{fmt(cycle.netPayout)}</p>
                        <p className="text-[10px] text-text-muted">
                          Gross {fmt(cycle.grossSales)} · Comm. {fmt(cycle.commission)}
                        </p>
                      </div>
                      <Badge variant={cycle.status === 'paid' ? 'success' : cycle.status === 'processing' ? 'warning' : 'default'}>
                        {cycle.status === 'paid' ? 'Settled' : cycle.status === 'processing' ? 'Processing' : 'Upcoming'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* How payouts work */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-gradient-to-r from-primary-50 to-blue-50 p-5 shadow-sm"
        >
          <h3 className="text-sm font-bold text-text-primary mb-3">How Payouts Work</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'Order Delivered', desc: 'Customer receives the product and delivery is confirmed', icon: Package },
              { step: '2', title: '7-Day Hold', desc: 'Funds are held for return/refund window protection', icon: Clock },
              { step: '3', title: 'Settlement Calculated', desc: 'Platform commission is deducted from gross amount', icon: Percent },
              { step: '4', title: 'Payout Released', desc: 'Net amount is transferred to your bank account', icon: Banknote },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
}

function buildPayoutCycles(deliveredOrders: SimpleOrder[], commRate: number): PayoutCycle[] {
  const monthMap = new Map<string, SimpleOrder[]>();

  deliveredOrders.forEach((o) => {
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap.has(key)) monthMap.set(key, []);
    monthMap.get(key)!.push(o);
  });

  const cycles: PayoutCycle[] = [];
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const sorted = Array.from(monthMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  sorted.forEach(([key, ords]) => {
    const gross = ords.reduce((s, o) => s + o.total, 0);
    const comm = gross * commRate / 100;
    const net = gross - comm;
    const [y, m] = key.split('-');
    const monthName = new Date(Number(y), Number(m) - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    cycles.push({
      id: key,
      period: monthName,
      grossSales: gross,
      commission: comm,
      netPayout: net,
      orders: ords.length,
      status: key === currentKey ? 'processing' : 'paid',
      date: key === currentKey ? 'Current cycle' : `Settled ${monthName}`,
    });
  });

  return cycles;
}
