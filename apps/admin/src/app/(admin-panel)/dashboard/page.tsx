'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
// `Link` is still used by the secondary KPI tiles below — they are
// custom-styled cards (not <StatCard>) so they keep their own wrappers.
import { DollarSign, ShoppingCart, Users, Store, Package, Clock, Star, ArrowUpRight } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { DataTable, type Column } from '@/components/dashboard/data-table';
import { Badge } from '@xelnova/ui';
import { apiDashboard, apiGet } from '@/lib/api';

interface RecentCustomer {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  _count: { orders: number };
}

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
  // Recent customer signups, surfaced as a quick deep-link to the 360°
  // history view at /customers?focus=<userId>. Loaded independently so the
  // main dashboard doesn't block on it.
  const [recentCustomers, setRecentCustomers] = useState<RecentCustomer[]>([]);
  const [recentCustomersLoading, setRecentCustomersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiDashboard()
      .then((d) => { if (!cancelled) setData(d as DashboardData); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiGet<RecentCustomer[]>('customers', { limit: '8', role: 'CUSTOMER' })
      .then((rows) => { if (!cancelled) setRecentCustomers(Array.isArray(rows) ? rows : []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setRecentCustomersLoading(false); });
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
          <StatCard
            loading={loading}
            label="Total Revenue"
            value={data ? `₹${data.totalRevenue.toLocaleString()}` : '—'}
            icon={DollarSign}
            href="/revenue"
            ariaLabel="Open revenue analytics"
          />
          <StatCard
            loading={loading}
            label="Total Orders"
            value={data?.totalOrders ?? '—'}
            change={orderChange || undefined}
            changeLabel="vs last month"
            icon={ShoppingCart}
            href="/orders"
            ariaLabel="Open all orders"
          />
          <StatCard
            loading={loading}
            label="Users"
            value={data?.totalCustomers ?? '—'}
            icon={Users}
            href="/customers"
            ariaLabel="Open customers list"
          />
          <StatCard
            loading={loading}
            label="Sellers"
            value={data ? `${data.activeSellers} / ${data.totalSellers}` : '—'}
            icon={Store}
            href="/sellers"
            ariaLabel="Open sellers list"
          />
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

        {/* Recent customers — quick entry point to the 360° purchase / refund
            history view. Clicking a row deep-links to /customers?focus=<id>
            which auto-opens the existing detail drawer. */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-text-muted">Recent customers</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Click any name to open the full purchase, refund, support and wallet history.
              </p>
            </div>
            <Link
              href="/customers"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
            >
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          {recentCustomersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-surface-muted/50 animate-pulse" />
              ))}
            </div>
          ) : recentCustomers.length === 0 ? (
            <p className="text-sm text-text-muted">No customers yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentCustomers.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/customers?focus=${encodeURIComponent(c.id)}`}
                    className="group flex items-center justify-between gap-3 py-2.5 px-1 rounded-lg hover:bg-surface-muted/40 transition-colors"
                    aria-label={`Open history for ${c.name ?? c.email}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate group-hover:text-primary-600">
                        {c.name?.trim() || c.email}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        {c.email}
                        {c.phone ? <span className="ml-2">· {c.phone}</span> : null}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={c._count.orders > 0 ? 'info' : 'default'}>
                        {c._count.orders} order{c._count.orders === 1 ? '' : 's'}
                      </Badge>
                      <span className="text-[11px] text-text-muted hidden sm:inline">
                        Joined {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                      <ArrowUpRight
                        size={14}
                        className="text-text-muted group-hover:text-primary-600 transition-colors"
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
