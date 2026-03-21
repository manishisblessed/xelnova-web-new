'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, ShoppingCart, Users, Store } from 'lucide-react';
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
  recentUsers?: Array<{ id: string; name: string; email: string; role: string; joinedAt: string }>;
}

export default function DashboardPage() {
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
    { key: 'status', header: 'Status', render: (row) => <Badge variant={row.status === 'Delivered' ? 'success' : row.status === 'Shipped' ? 'info' : 'warning'}>{row.status}</Badge> },
    { key: 'createdAt', header: 'Date', render: (row) => new Date(row.createdAt).toLocaleDateString() },
  ];

  return (
    <>
      <DashboardHeader title="Admin Dashboard" />
      <div className="p-6 space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard loading={loading} label={kpis[0]?.label ?? 'Revenue'} value={kpis[0]?.value ?? '—'} change={kpis[0]?.change} changeLabel={kpis[0]?.changeLabel} icon={DollarSign} />
          <StatCard loading={loading} label={kpis[1]?.label ?? 'Orders'} value={kpis[1]?.value ?? '—'} change={kpis[1]?.change} changeLabel={kpis[1]?.changeLabel} icon={ShoppingCart} />
          <StatCard loading={loading} label={kpis[2]?.label ?? 'Customers'} value={kpis[2]?.value ?? '—'} change={kpis[2]?.change} changeLabel={kpis[2]?.changeLabel} icon={Users} />
          <StatCard loading={loading} label={kpis[3]?.label ?? 'Sellers'} value={kpis[3]?.value ?? '—'} change={kpis[3]?.change} changeLabel={kpis[3]?.changeLabel} icon={Store} />
        </motion.div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Revenue (last 6 months)" data={data?.revenueChart ?? []} loading={loading} />
          <ChartCard title="Orders (last 7 days)" data={data?.ordersChart ?? []} loading={loading} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
            <h3 className="text-sm font-medium text-text-muted mb-4">Recent Orders</h3>
            <DataTable columns={orderColumns} data={data?.recentOrders ?? []} keyExtractor={(row) => row.id} loading={loading} emptyMessage="No orders yet" />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
            <h3 className="text-sm font-medium text-text-muted mb-4">Recent Users</h3>
            <DataTable
              columns={[
                { key: 'name', header: 'Name' },
                { key: 'email', header: 'Email' },
                { key: 'role', header: 'Role' },
                { key: 'joinedAt', header: 'Joined', render: (row) => new Date(row.joinedAt).toLocaleDateString() },
              ]}
              data={data?.recentUsers ?? []}
              keyExtractor={(row) => row.id}
              loading={loading}
              emptyMessage="No users yet"
            />
          </div>
        </div>
      </div>
    </>
  );
}
