'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Package, ShoppingCart, IndianRupee } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { apiGetSalesAnalytics } from '@/lib/api';

type DailyData = { date: string; revenue: number; orders: number; units: number };
type TopProduct = { id: string; name: string; revenue: number; units: number };
type CategoryData = { category: string; revenue: number; units: number };

type AnalyticsData = {
  period: string;
  summary: { totalRevenue: number; totalOrders: number; totalUnits: number };
  dailyData: DailyData[];
  topProducts: TopProduct[];
  categoryBreakdown: CategoryData[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('month');

  const loadData = async (p: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetSalesAnalytics(p) as AnalyticsData;
      setData(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(period); }, [period]);

  const maxRevenue = data?.dailyData.reduce((m, d) => Math.max(m, d.revenue), 0) || 1;

  return (
    <>
      <DashboardHeader title="Sales Analytics" subtitle="Revenue, orders, and product performance" />
      <div className="p-6 max-w-6xl">
        <div className="flex gap-2 mb-6">
          {['week', 'month', 'year'].map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${period === p ? 'bg-violet-600 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}>
              {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'This Year'}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading analytics...</div>
        ) : data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><IndianRupee size={16} />Revenue</div>
                <div className="text-2xl font-bold text-gray-900">₹{data.summary.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><ShoppingCart size={16} />Orders</div>
                <div className="text-2xl font-bold text-gray-900">{data.summary.totalOrders}</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Package size={16} />Units Sold</div>
                <div className="text-2xl font-bold text-gray-900">{data.summary.totalUnits}</div>
              </motion.div>
            </div>

            {/* Revenue Chart (bar chart) */}
            {data.dailyData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2"><TrendingUp size={18} />Daily Revenue</h3>
                <div className="flex items-end gap-1 h-48 overflow-x-auto pb-2">
                  {data.dailyData.map((d, i) => {
                    const height = Math.max((d.revenue / maxRevenue) * 100, 2);
                    return (
                      <div key={d.date} className="flex flex-col items-center flex-shrink-0" style={{ minWidth: data.dailyData.length > 14 ? 24 : 40 }}>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ delay: i * 0.02, duration: 0.3 }}
                          className="w-full bg-violet-500 rounded-t-md hover:bg-violet-600 transition-colors cursor-default relative group"
                          title={`${d.date}: ₹${d.revenue.toFixed(0)}`}
                        >
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                            ₹{d.revenue.toFixed(0)}
                          </div>
                        </motion.div>
                        <span className="text-[10px] text-gray-400 mt-1 rotate-[-45deg] origin-top-left whitespace-nowrap">
                          {d.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              {data.topProducts.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="text-base font-semibold mb-4 flex items-center gap-2"><BarChart3 size={18} />Top Products</h3>
                  <div className="space-y-3">
                    {data.topProducts.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.units} units</p>
                        </div>
                        <span className="text-sm font-semibold">₹{p.revenue.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Breakdown */}
              {data.categoryBreakdown.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="text-base font-semibold mb-4">Category Breakdown</h3>
                  <div className="space-y-3">
                    {data.categoryBreakdown.map((c) => {
                      const pct = data.summary.totalRevenue > 0 ? (c.revenue / data.summary.totalRevenue) * 100 : 0;
                      return (
                        <div key={c.category}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{c.category}</span>
                            <span className="text-gray-500">₹{c.revenue.toFixed(0)} ({pct.toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} className="h-full bg-violet-500 rounded-full" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
