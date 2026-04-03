'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StatCard } from '@/components/dashboard/stat-card';
const ChartCard = dynamic(() => import('@/components/dashboard/chart-card').then((m) => m.ChartCard), { ssr: false, loading: () => <div className="rounded-2xl border border-border bg-surface p-6 shadow-card h-[280px] flex items-center justify-center"><div className="w-full h-full max-w-[400px] rounded-xl bg-surface-muted animate-pulse" /></div> });
import { DollarSign, Percent, Truck, Receipt, ShoppingCart } from 'lucide-react';
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

export default function RevenuePage() {
  const [data, setData] = useState<RevenuePayload | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRevenue();
      setData(res as RevenuePayload);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load revenue');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartPoints =
    data?.dailyRevenue?.map((d) => ({
      name: d.date,
      amount: d.amount,
    })) ?? [];

  const kpis = data
    ? [
        { label: 'Total revenue', value: `₹${data.totalRevenue.toLocaleString()}`, icon: DollarSign },
        { label: 'Total discount', value: `₹${data.totalDiscount.toLocaleString()}`, icon: Percent },
        { label: 'Total shipping', value: `₹${data.totalShipping.toLocaleString()}`, icon: Truck },
        { label: 'Total tax', value: `₹${data.totalTax.toLocaleString()}`, icon: Receipt },
        { label: 'Orders (in range)', value: data.orderCount.toLocaleString(), icon: ShoppingCart },
      ]
    : [];

  return (
    <>
      <DashboardHeader title="Revenue" />
      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => fetchData()}
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-muted transition-colors"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <StatCard key={i} label="" value="" loading />)
            : kpis.map((kpi, i) => (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <StatCard label={kpi.label} value={kpi.value} icon={kpi.icon} />
                </motion.div>
              ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 max-w-4xl">
          <ChartCard title="Daily revenue" data={chartPoints} dataKey="amount" loading={loading} />
        </div>

        {!loading && !data && (
          <p className="text-sm text-text-muted text-center py-8">No revenue data available for the selected period.</p>
        )}
      </div>
    </>
  );
}
