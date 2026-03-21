'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { ChartCard } from '@/components/dashboard/chart-card';
import { DollarSign, ShoppingCart, TrendingUp, RotateCcw } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { toast } from 'sonner';

interface RevenueData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  refunds: number;
  monthly: { name: string; revenue: number; orders: number; refunds: number }[];
  byCategory: { name: string; revenue: number }[];
  byPayment: { name: string; revenue: number; count: number }[];
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try { setData(await apiGet<RevenueData>('revenue')); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const kpis = data ? [
    { label: 'Total Revenue', value: `₹${(data.totalRevenue / 100000).toFixed(1)}L`, icon: DollarSign, change: 12.5 },
    { label: 'Total Orders', value: data.totalOrders.toLocaleString(), icon: ShoppingCart, change: 8.2 },
    { label: 'Avg Order Value', value: `₹${data.avgOrderValue.toLocaleString()}`, icon: TrendingUp, change: 3.1 },
    { label: 'Refunds', value: `₹${(data.refunds / 1000).toFixed(0)}K`, icon: RotateCcw, change: -2.4 },
  ] : [];

  return (
    <>
      <DashboardHeader title="Revenue" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-surface-muted animate-pulse" />) :
            kpis.map((kpi, i) => (
              <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <StatCard label={kpi.label} value={kpi.value} icon={kpi.icon} change={kpi.change} />
              </motion.div>
            ))
          }
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Monthly Revenue"
            data={data?.monthly ?? []}
            dataKey="revenue"
            loading={loading}
          />
          <ChartCard
            title="Monthly Orders"
            data={data?.monthly ?? []}
            dataKey="orders"
            loading={loading}
          />
        </div>

        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-surface shadow-card p-6">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Revenue by Category</h3>
              <div className="space-y-3">
                {data.byCategory.map(cat => {
                  const maxRev = Math.max(...data.byCategory.map(c => c.revenue));
                  return (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">{cat.name}</span>
                        <span className="font-medium">₹{(cat.revenue / 1000).toFixed(0)}K</span>
                      </div>
                      <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${(cat.revenue / maxRev) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-surface shadow-card p-6">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Revenue by Payment Method</h3>
              <div className="space-y-3">
                {data.byPayment.map(pm => (
                  <div key={pm.name} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                    <span className="text-text-secondary">{pm.name}</span>
                    <div className="text-right">
                      <span className="font-medium">₹{(pm.revenue / 1000).toFixed(0)}K</span>
                      <span className="text-text-muted text-xs ml-2">({pm.count} txns)</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
}
