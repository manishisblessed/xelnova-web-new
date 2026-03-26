'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  IndianRupee,
  ShoppingCart,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge } from '@xelnova/ui';
import { apiDashboard } from '@/lib/api';

/** Shape returned by GET /seller/dashboard */
interface SellerDashboardData {
  totalProducts: number;
  activeProducts: number;
  pendingProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  monthRevenue: number;
  totalSales: number;
  rating: number;
  verified: boolean;
}

export default function SellerDashboardPage() {
  const [data, setData] = useState<SellerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiDashboard()
      .then((res) => {
        if (!cancelled) setData(res as SellerDashboardData);
      })
      .catch((err: Error) => {
        toast.error(err.message || 'Failed to load dashboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fmt = (n: number) =>
    `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <>
      <DashboardHeader title="Seller Dashboard" />
      <div className="p-6 space-y-6">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
        >
          <motion.div variants={item}>
            <StatCard
              loading={loading}
              label="Total products"
              value={data?.totalProducts ?? '—'}
              icon={Package}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              loading={loading}
              label="Active products"
              value={data?.activeProducts ?? '—'}
              icon={CheckCircle}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              loading={loading}
              label="Pending products"
              value={data?.pendingProducts ?? '—'}
              icon={Clock}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              loading={loading}
              label="Total orders"
              value={data?.totalOrders ?? '—'}
              icon={ShoppingCart}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              loading={loading}
              label="Pending orders"
              value={data?.pendingOrders ?? '—'}
              icon={Clock}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              loading={loading}
              label="Total revenue"
              value={data != null ? fmt(data.totalRevenue) : '—'}
              icon={IndianRupee}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              loading={loading}
              label="This month revenue"
              value={data != null ? fmt(data.monthRevenue) : '—'}
              icon={IndianRupee}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              loading={loading}
              label="Total sales"
              value={data?.totalSales ?? '—'}
              icon={TrendingUp}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              loading={loading}
              label="Rating"
              value={data != null && typeof data.rating === 'number' ? data.rating.toFixed(1) : '—'}
              icon={Star}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatCard
              loading={loading}
              label="Verified store"
              value={data == null ? '—' : data.verified ? 'Yes' : 'No'}
              icon={data?.verified ? CheckCircle : XCircle}
            />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-border bg-surface p-6 shadow-card flex flex-wrap items-center gap-3"
        >
          <span className="text-sm font-medium text-text-muted">Account status</span>
          {loading ? (
            <div className="h-6 w-24 rounded-full bg-surface-muted animate-pulse" />
          ) : (
            <Badge variant={data?.verified ? 'success' : 'warning'}>
              {data?.verified ? 'Verified seller' : 'Verification pending'}
            </Badge>
          )}
        </motion.div>
      </div>
    </>
  );
}
