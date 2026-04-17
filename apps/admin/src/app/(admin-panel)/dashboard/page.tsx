'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { DollarSign, ShoppingCart, Users, Store, Package, Clock, Star } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { DataTable, type Column } from '@/components/dashboard/data-table';
import { Badge } from '@xelnova/ui';
import { apiDashboard } from '@/lib/api';

interface DashboardData {
  totalProducts: number;
  totalOrders: number;
  /** Non-admin user accounts (customers + sellers); matches Customers list */
  totalCustomers: number;
  totalSellers: number;
  monthOrders: number;
  lastMonthOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  monthRevenue: number;
  activeSellers: number;
  pendingProducts: number;
  pendingReviews: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    createdAt: string;
    user: { name: string; email: string };
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    action: string;
    message: string;
    createdAt: string;
  }>;
}

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'default'> = {
  DELIVERED: 'success', SHIPPED: 'info', PROCESSING: 'warning', PENDING: 'default',
  CONFIRMED: 'info', CANCELLED: 'danger', RETURNED: 'danger', REFUNDED: 'danger',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiDashboard()
      .then((d) => { if (!cancelled) setData(d as DashboardData); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const orderChange = data && data.lastMonthOrders > 0
    ? Math.round(((data.monthOrders - data.lastMonthOrders) / data.lastMonthOrders) * 100)
    : 0;

  const orderColumns: Column<DashboardData['recentOrders'][0]>[] = [
    { key: 'orderNumber', header: 'Order' },
    { key: 'user', header: 'Customer', render: (row) => row.user?.name || '—' },
    { key: 'total', header: 'Total', render: (row) => `₹${row.total.toLocaleString()}` },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={STATUS_VARIANT[row.status] ?? 'default'}>{row.status.charAt(0) + row.status.slice(1).toLowerCase()}</Badge> },
    { key: 'createdAt', header: 'Date', render: (row) => new Date(row.createdAt).toLocaleDateString() },
  ];

  const activityColumns: Column<DashboardData['recentActivity'][0]>[] = [
    { key: 'action', header: 'Action' },
    { key: 'message', header: 'Details', render: (row) => <span className="text-xs">{row.message}</span> },
    { key: 'createdAt', header: 'Time', render: (row) => new Date(row.createdAt).toLocaleString() },
  ];

  return (
    <>
      <DashboardHeader title="Admin Dashboard" />
      <div className="p-6 space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/revenue" className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 transition-transform hover:-translate-y-0.5" aria-label="Open revenue analytics">
            <StatCard loading={loading} label="Total Revenue" value={data ? `₹${data.totalRevenue.toLocaleString()}` : '—'} icon={DollarSign} />
          </Link>
          <Link href="/orders" className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 transition-transform hover:-translate-y-0.5" aria-label="Open all orders">
            <StatCard loading={loading} label="Total Orders" value={data?.totalOrders ?? '—'} change={orderChange || undefined} changeLabel="vs last month" icon={ShoppingCart} />
          </Link>
          <Link href="/customers" className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 transition-transform hover:-translate-y-0.5" aria-label="Open customers list">
            <StatCard loading={loading} label="Users" value={data?.totalCustomers ?? '—'} icon={Users} />
          </Link>
          <Link href="/sellers" className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 transition-transform hover:-translate-y-0.5" aria-label="Open sellers list">
            <StatCard loading={loading} label="Sellers" value={data ? `${data.activeSellers} / ${data.totalSellers}` : '—'} icon={Store} />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Link
            href="/products"
            className="rounded-2xl border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
            aria-label="Open products list"
          >
            <div className="flex items-center gap-3 mb-1">
              <Package size={18} className="text-text-muted" />
              <span className="text-sm text-text-muted">Products</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{loading ? '—' : data?.totalProducts}</p>
            {!loading && data && data.pendingProducts > 0 && (
              <span className="text-xs text-accent-600 mt-1 inline-block">
                {data.pendingProducts} pending review
              </span>
            )}
          </Link>
          <Link
            href="/orders?status=PENDING"
            className="rounded-2xl border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
            aria-label="Open pending orders"
          >
            <div className="flex items-center gap-3 mb-1">
              <Clock size={18} className="text-text-muted" />
              <span className="text-sm text-text-muted">Pending Orders</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{loading ? '—' : data?.pendingOrders}</p>
            {!loading && (data?.pendingOrders ?? 0) > 0 && (
              <span className="text-xs text-accent-600 mt-1 inline-block">View pending orders</span>
            )}
          </Link>
          <Link
            href="/reviews"
            className="rounded-2xl border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
            aria-label="Open pending reviews"
          >
            <div className="flex items-center gap-3 mb-1">
              <Star size={18} className="text-text-muted" />
              <span className="text-sm text-text-muted">Pending Reviews</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{loading ? '—' : data?.pendingReviews ?? 0}</p>
            {!loading && (data?.pendingReviews ?? 0) > 0 && (
              <span className="text-xs text-accent-600 mt-1 inline-block">Review pending</span>
            )}
          </Link>
          <Link
            href="/revenue"
            className="rounded-2xl border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
            aria-label="Open monthly revenue"
          >
            <div className="flex items-center gap-3 mb-1">
              <DollarSign size={18} className="text-text-muted" />
              <span className="text-sm text-text-muted">This Month</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{loading ? '—' : `₹${(data?.monthRevenue ?? 0).toLocaleString()}`}</p>
            <p className="text-xs text-text-muted mt-1">{data?.monthOrders ?? 0} orders</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
            <h3 className="text-sm font-medium text-text-muted mb-4">Recent Orders</h3>
            <DataTable columns={orderColumns} data={data?.recentOrders ?? []} keyExtractor={(row) => row.id} loading={loading} emptyMessage="No orders yet" />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
            <h3 className="text-sm font-medium text-text-muted mb-4">Recent Activity</h3>
            <DataTable columns={activityColumns} data={data?.recentActivity ?? []} keyExtractor={(row) => row.id} loading={loading} emptyMessage="No recent activity" />
          </div>
        </div>
      </div>
    </>
  );
}
