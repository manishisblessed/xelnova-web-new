'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Truck,
  Package,
  Building2,
  UserCheck,
  PackageCheck,
  Clock,
  AlertTriangle,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { Badge, Skeleton } from '@xelnova/ui';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { DataTable, type Column } from '@/components/dashboard/data-table';
import { apiGet } from '@/lib/api';

// ─── Types ───

interface Shipment {
  id: string;
  shippingMode: string;
  courierProvider: string | null;
  awbNumber: string | null;
  trackingUrl: string | null;
  shipmentStatus: string;
  weight: number | null;
  dimensions: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  shipment?: Shipment | null;
}

interface CourierRow {
  courier: string;
  total: number;
  delivered: number;
  inTransit: number;
  pending: number;
  rto: number;
  cancelled: number;
  other: number;
}

interface StatusRow {
  status: string;
  count: number;
  percent: string;
}

interface ModeRow {
  mode: string;
  label: string;
  count: number;
  percent: string;
}

// ─── Helpers ───

const FRIENDLY_MODE: Record<string, string> = {
  XELGO: 'Xelgo (Platform)',
  SELLER_COURIER: "Seller's Courier Account",
  SELF_SHIP: 'Self Ship',
};

const MODE_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
  XELGO: 'success',
  SELLER_COURIER: 'info',
  SELF_SHIP: 'warning',
};

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'default'> = {
  DELIVERED: 'success',
  OUT_FOR_DELIVERY: 'info',
  IN_TRANSIT: 'info',
  PICKED_UP: 'info',
  BOOKED: 'default',
  PENDING: 'warning',
  RTO: 'danger',
  RTO_DELIVERED: 'danger',
  CANCELLED: 'danger',
};

const STATUS_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  DELIVERED: PackageCheck,
  IN_TRANSIT: Truck,
  OUT_FOR_DELIVERY: Truck,
  PICKED_UP: Package,
  BOOKED: Clock,
  PENDING: Clock,
  RTO: RotateCcw,
  RTO_DELIVERED: RotateCcw,
  CANCELLED: XCircle,
};

function classifyStatus(status: string) {
  const s = status.toUpperCase();
  if (s === 'DELIVERED') return 'delivered';
  if (['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'PICKED_UP'].includes(s)) return 'inTransit';
  if (['PENDING', 'BOOKED'].includes(s)) return 'pending';
  if (['RTO', 'RTO_DELIVERED'].includes(s)) return 'rto';
  if (s === 'CANCELLED') return 'cancelled';
  return 'other';
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return `${((n / total) * 100).toFixed(1)}%`;
}

// ─── Page ───

export default function CourierSummaryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<Order[]>('orders', { limit: '5000' });
        if (!cancelled) setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ─── Aggregate data ───

  const withShipment = orders.filter((o) => o.shipment);
  const withoutShipment = orders.filter((o) => !o.shipment);
  const totalShipments = withShipment.length;

  // Mode breakdown
  const modeCounts: Record<string, number> = {};
  for (const o of withShipment) {
    const mode = o.shipment!.shippingMode || 'UNKNOWN';
    modeCounts[mode] = (modeCounts[mode] || 0) + 1;
  }

  const modeRows: ModeRow[] = Object.entries(modeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([mode, count]) => ({
      mode,
      label: FRIENDLY_MODE[mode] || mode.replace(/_/g, ' '),
      count,
      percent: pct(count, totalShipments),
    }));

  // Courier breakdown
  const courierMap = new Map<string, CourierRow>();
  for (const o of withShipment) {
    const courier = o.shipment!.courierProvider?.trim() || 'Not assigned';
    if (!courierMap.has(courier)) {
      courierMap.set(courier, { courier, total: 0, delivered: 0, inTransit: 0, pending: 0, rto: 0, cancelled: 0, other: 0 });
    }
    const row = courierMap.get(courier)!;
    row.total++;
    const cls = classifyStatus(o.shipment!.shipmentStatus);
    row[cls]++;
  }
  const courierRows = [...courierMap.values()].sort((a, b) => b.total - a.total);

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  for (const o of withShipment) {
    const st = o.shipment!.shipmentStatus || 'UNKNOWN';
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  }
  const statusRows: StatusRow[] = Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({
      status,
      count,
      percent: pct(count, totalShipments),
    }));

  // KPI values
  const xelgoCount = modeCounts['XELGO'] || 0;
  const sellerCourierCount = modeCounts['SELLER_COURIER'] || 0;
  const selfShipCount = modeCounts['SELF_SHIP'] || 0;

  // ─── Table columns ───

  const courierColumns: Column<CourierRow>[] = [
    {
      key: 'courier',
      header: 'Courier',
      render: (r) => <span className="font-medium text-text-primary">{r.courier}</span>,
    },
    { key: 'total', header: 'Total Orders', render: (r) => <span className="font-bold">{r.total}</span> },
    {
      key: 'delivered',
      header: 'Delivered',
      render: (r) => <span className="text-success-600 font-medium">{r.delivered}</span>,
    },
    {
      key: 'inTransit',
      header: 'In Transit',
      render: (r) => <span className="text-info-600 font-medium">{r.inTransit}</span>,
    },
    {
      key: 'pending',
      header: 'Pending',
      render: (r) => <span className="text-warning-600 font-medium">{r.pending}</span>,
    },
    {
      key: 'rto',
      header: 'RTO',
      render: (r) => r.rto > 0 ? <span className="text-danger-600 font-medium">{r.rto}</span> : <span className="text-text-muted">0</span>,
    },
    {
      key: 'cancelled',
      header: 'Cancelled',
      render: (r) => r.cancelled > 0 ? <span className="text-danger-500 font-medium">{r.cancelled}</span> : <span className="text-text-muted">0</span>,
    },
  ];

  const statusColumns: Column<StatusRow>[] = [
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const Icon = STATUS_ICON[r.status];
        return (
          <div className="flex items-center gap-2">
            {Icon && <Icon size={15} className="text-text-muted" />}
            <Badge variant={STATUS_VARIANT[r.status] ?? 'default'}>
              {r.status.replace(/_/g, ' ')}
            </Badge>
          </div>
        );
      },
    },
    { key: 'count', header: 'Orders', render: (r) => <span className="font-bold">{r.count}</span> },
    { key: 'percent', header: '% of Total' },
  ];

  const modeColumns: Column<ModeRow>[] = [
    {
      key: 'mode',
      header: 'Shipping Mode',
      render: (r) => (
        <Badge variant={MODE_VARIANT[r.mode] ?? 'default'} className="text-xs">
          {r.label}
        </Badge>
      ),
    },
    { key: 'count', header: 'Orders', render: (r) => <span className="font-bold">{r.count}</span> },
    { key: 'percent', header: '% of Shipments' },
  ];

  if (error) {
    return (
      <>
        <DashboardHeader title="Courier Summary" />
        <div className="p-6">
          <div className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-danger-500 mb-2" />
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader title="Courier Summary" />
      <div className="p-6 space-y-6">
        {/* KPI cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
        >
          <StatCard
            loading={loading}
            label="Total Shipments"
            value={totalShipments}
            icon={Truck}
          />
          <StatCard
            loading={loading}
            label="Xelgo Shipments"
            value={xelgoCount}
            changeLabel={totalShipments > 0 ? pct(xelgoCount, totalShipments) : undefined}
            icon={Building2}
          />
          <StatCard
            loading={loading}
            label="Seller's Courier"
            value={sellerCourierCount}
            changeLabel={totalShipments > 0 ? pct(sellerCourierCount, totalShipments) : undefined}
            icon={UserCheck}
          />
          <StatCard
            loading={loading}
            label="Self Ship"
            value={selfShipCount}
            changeLabel={totalShipments > 0 ? pct(selfShipCount, totalShipments) : undefined}
            icon={Package}
          />
          <StatCard
            loading={loading}
            label="No Shipment Yet"
            value={withoutShipment.length}
            changeLabel={orders.length > 0 ? pct(withoutShipment.length, orders.length) : undefined}
            icon={Clock}
          />
        </motion.div>

        {/* Shipping mode breakdown */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-primary-600" />
            <h3 className="text-sm font-semibold text-text-primary">
              Shipping Mode Breakdown
            </h3>
            <span className="text-xs text-text-muted">
              Xelgo vs Seller&apos;s Courier vs Self Ship
            </span>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} shape="rectangle" height={40} />
              ))}
            </div>
          ) : modeRows.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">No shipment data available.</p>
          ) : (
            <>
              <div className="mb-4 flex h-4 overflow-hidden rounded-full bg-surface-muted">
                {modeRows.map((row) => (
                  <div
                    key={row.mode}
                    className={`h-full transition-all ${
                      row.mode === 'XELGO'
                        ? 'bg-success-500'
                        : row.mode === 'SELLER_COURIER'
                          ? 'bg-info-500'
                          : row.mode === 'SELF_SHIP'
                            ? 'bg-warning-500'
                            : 'bg-text-muted'
                    }`}
                    style={{ width: `${(row.count / totalShipments) * 100}%` }}
                    title={`${row.label}: ${row.count} (${row.percent})`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-4 mb-4 text-xs">
                {modeRows.map((row) => (
                  <div key={row.mode} className="flex items-center gap-1.5">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${
                        row.mode === 'XELGO'
                          ? 'bg-success-500'
                          : row.mode === 'SELLER_COURIER'
                            ? 'bg-info-500'
                            : row.mode === 'SELF_SHIP'
                              ? 'bg-warning-500'
                              : 'bg-text-muted'
                      }`}
                    />
                    <span className="text-text-secondary font-medium">{row.label}</span>
                    <span className="text-text-muted">
                      {row.count} ({row.percent})
                    </span>
                  </div>
                ))}
              </div>
              <DataTable columns={modeColumns} data={modeRows} keyExtractor={(r) => r.mode} />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Courier-wise breakdown — wider */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-surface p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Truck size={18} className="text-primary-600" />
              <h3 className="text-sm font-semibold text-text-primary">
                Courier-wise Breakdown
              </h3>
            </div>
            <DataTable
              columns={courierColumns}
              data={courierRows}
              keyExtractor={(r) => r.courier}
              loading={loading}
              emptyMessage="No shipments found"
            />
          </div>

          {/* Status breakdown */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <PackageCheck size={18} className="text-primary-600" />
              <h3 className="text-sm font-semibold text-text-primary">
                Shipment Status
              </h3>
            </div>
            <DataTable
              columns={statusColumns}
              data={statusRows}
              keyExtractor={(r) => r.status}
              loading={loading}
              emptyMessage="No shipments found"
            />
          </div>
        </div>
      </div>
    </>
  );
}
