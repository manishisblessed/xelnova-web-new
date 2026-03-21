'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, ShoppingCart, Package, AlertTriangle } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { ChartCard } from '@/components/dashboard/chart-card';
import { DataTable, type Column } from '@/components/dashboard/data-table';
import { Badge } from '@xelnova/ui';
import { apiDashboard } from '@/lib/api';

interface DashboardResponse {
  kpis: Array<{ label: string; value: string | number; change?: number; changeLabel?: string }>;
  revenueChart: Array<{ name: string; value: number }>;
  ordersChart: Array<{ name: string; value: number }>;
  recentOrders: Array<{ id: string; orderNumber: string; customer: string; total: number; status: string; createdAt: string }>;
  earnings?: { total: number; pending: number; paid: number };
  inventory?: { lowStock: number; outOfStock: number; totalProducts: number };
  payouts?: Array<{ id: string; amount: number; status: string; date: string }>;
}

export default function SellerDashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiDashboard()
      .then(setData)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const kpis = data?.kpis ?? [];
  const orderColumns: Column<DashboardResponse['recentOrders'][0]>[] = [
    { key: 'orderNumber', header: 'Order' },
    { key: 'customer', header: 'Customer' },
    { key: 'total', header: 'Total', render: (row) => `₹${row.total.toLocaleString()}` },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={row.status === 'Shipped' ? 'success' : row.status === 'Pending' ? 'warning' : 'info'}>{row.status}</Badge> },
    { key: 'createdAt', header: 'Date', render: (row) => new Date(row.createdAt).toLocaleDateString() },
  ];
  const earnings = data?.earnings;
  const inventory = data?.inventory;
  const payouts = data?.payouts ?? [];

  return (
    <>
      <DashboardHeader title="Seller Dashboard" />
      <div className="p-6 space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard loading={loading} label={kpis[0]?.label ?? 'Earnings'} value={kpis[0]?.value ?? '—'} change={kpis[0]?.change} changeLabel={kpis[0]?.changeLabel} icon={IndianRupee} />
          <StatCard loading={loading} label={kpis[1]?.label ?? 'Orders'} value={kpis[1]?.value ?? '—'} change={kpis[1]?.change} changeLabel={kpis[1]?.changeLabel} icon={ShoppingCart} />
          <StatCard loading={loading} label={kpis[2]?.label ?? 'Products'} value={kpis[2]?.value ?? '—'} change={kpis[2]?.change} changeLabel={kpis[2]?.changeLabel} icon={Package} />
          <StatCard loading={loading} label={kpis[3]?.label ?? 'Conversion'} value={kpis[3]?.value ?? '—'} change={kpis[3]?.change} changeLabel={kpis[3]?.changeLabel} icon={IndianRupee} />
        </motion.div>
        {earnings && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-surface p-6 shadow-card">
            <h3 className="text-sm font-medium text-text-muted mb-4">Earnings Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-surface-muted p-4">
                <p className="text-xs text-text-muted">Total</p>
                <p className="text-xl font-bold text-text-primary mt-1">₹{earnings.total.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-success-50 border border-success-200 p-4">
                <p className="text-xs text-success-700">Paid</p>
                <p className="text-xl font-bold text-success-700 mt-1">₹{earnings.paid.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-accent-50 border border-accent-200 p-4">
                <p className="text-xs text-accent-700">Pending</p>
                <p className="text-xl font-bold text-accent-700 mt-1">₹{earnings.pending.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        )}
        {inventory && (inventory.lowStock > 0 || inventory.outOfStock > 0) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-accent-200 bg-accent-50 p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-accent-600 shrink-0" />
            <div>
              <p className="font-medium text-accent-800">Inventory alert</p>
              <p className="text-sm text-accent-700">{inventory.lowStock} low stock, {inventory.outOfStock} out of stock. Total: {inventory.totalProducts}.</p>
            </div>
          </motion.div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Earnings (last 6 months)" data={data?.revenueChart ?? []} loading={loading} />
          <ChartCard title="Orders (last 7 days)" data={data?.ordersChart ?? []} loading={loading} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
            <h3 className="text-sm font-medium text-text-muted mb-4">Recent Orders</h3>
            <DataTable columns={orderColumns} data={data?.recentOrders ?? []} keyExtractor={(row) => row.id} loading={loading} emptyMessage="No orders yet" />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
            <h3 className="text-sm font-medium text-text-muted mb-4">Payouts</h3>
            <DataTable
              columns={[
                { key: 'amount', header: 'Amount', render: (row) => `₹${row.amount.toLocaleString()}` },
                { key: 'status', header: 'Status', render: (row) => <Badge variant={row.status === 'Completed' ? 'success' : 'warning'}>{row.status}</Badge> },
                { key: 'date', header: 'Date', render: (row) => new Date(row.date).toLocaleDateString() },
              ]}
              data={payouts}
              keyExtractor={(row) => row.id}
              loading={loading}
              emptyMessage="No payouts yet"
            />
          </div>
        </div>
      </div>
    </>
  );
}
