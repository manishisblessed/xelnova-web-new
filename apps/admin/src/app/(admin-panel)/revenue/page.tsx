'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StatCard } from '@/components/dashboard/stat-card';
const ChartCard = dynamic(() => import('@/components/dashboard/chart-card').then((m) => m.ChartCard), { ssr: false, loading: () => <div className="rounded-2xl border border-border bg-surface p-6 shadow-card h-[280px] flex items-center justify-center"><div className="w-full h-full max-w-[400px] rounded-xl bg-surface-muted animate-pulse" /></div> });
import { DollarSign, Percent, Truck, Receipt, ShoppingCart, Calendar } from 'lucide-react';
import { apiRevenue } from '@/lib/api';
import { toast } from 'sonner';

interface RevenuePayload {
  totalRevenue: number;
  totalDiscount: number;
  totalShipping: number;
  totalTax: number;
  orderCount: number;
  dailyRevenue: { date: string; amount: number }[];
}

const PRESETS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'All time', days: 0 },
];

export default function RevenuePage() {
  const [data, setData] = useState<RevenuePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activePreset, setActivePreset] = useState(0);

  const fetchData = useCallback(async (from?: string, to?: string) => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (from) params.dateFrom = from;
      if (to) params.dateTo = to;
      const res = await apiRevenue(Object.keys(params).length > 0 ? params : undefined);
      setData(res as RevenuePayload);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load revenue');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyPreset = (days: number, index: number) => {
    setActivePreset(index);
    if (days === 0) {
      setDateFrom('');
      setDateTo('');
      fetchData();
    } else {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - days);
      const f = from.toISOString().split('T')[0];
      const t = to.toISOString().split('T')[0];
      setDateFrom(f);
      setDateTo(t);
      fetchData(f, t);
    }
  };

  useEffect(() => {
    applyPreset(30, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCustomRange = () => {
    setActivePreset(-1);
    fetchData(dateFrom || undefined, dateTo || undefined);
  };

  const chartPoints = data?.dailyRevenue?.map((d) => ({ name: d.date, amount: d.amount })) ?? [];

  const kpis = data
    ? [
        { label: 'Total Revenue', value: `₹${data.totalRevenue.toLocaleString()}`, icon: DollarSign },
        { label: 'Total Discount', value: `₹${data.totalDiscount.toLocaleString()}`, icon: Percent },
        { label: 'Shipping Revenue', value: `₹${data.totalShipping.toLocaleString()}`, icon: Truck },
        { label: 'Tax Collected', value: `₹${data.totalTax.toLocaleString()}`, icon: Receipt },
        { label: 'Orders', value: data.orderCount.toLocaleString(), icon: ShoppingCart },
      ]
    : [];

  return (
    <>
      <DashboardHeader title="Revenue Analytics" />
      <div className="p-6 space-y-6">
        {/* Date range controls */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
            {PRESETS.map((preset, i) => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset.days, i)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activePreset === i ? 'bg-primary-600 text-white' : 'text-text-secondary hover:bg-surface-muted'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-text-muted mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
              />
            </div>
            <button
              onClick={handleCustomRange}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-muted transition-colors flex items-center gap-1.5"
            >
              <Calendar size={14} /> Apply
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <StatCard key={i} label="" value="" loading />)
            : kpis.map((kpi, i) => (
                <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <StatCard label={kpi.label} value={kpi.value} icon={kpi.icon} />
                </motion.div>
              ))}
        </div>

        {/* Revenue chart */}
        <div className="grid grid-cols-1 gap-6 max-w-4xl">
          <ChartCard title="Daily Revenue" data={chartPoints} dataKey="amount" loading={loading} />
        </div>

        {!loading && !data && (
          <p className="text-sm text-text-muted text-center py-8">No revenue data available for the selected period.</p>
        )}
      </div>
    </>
  );
}
