'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { FormField, FormSelect, FormTextarea } from '@/components/dashboard/form-field';
import {
  CalendarDays,
  DollarSign,
  Eye,
  IndianRupee,
  Loader2,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';
import { apiGetFull, apiPost, apiUpdate } from '@/lib/api';
import { cn } from '@xelnova/utils';

interface Payout {
  id: string;
  amount: number;
  status: string;
  note: string | null;
  requestedAt: string;
  paidAt: string | null;
  courierDeduction?: number;
  // New: settlement hold + snapshot fields
  holdUntil?: string | null;
  releasedAt?: string | null;
  gross?: number | null;
  commission?: number | null;
  xelgoServiceCharge?: number | null;
  seller: { storeName: string; user: { name: string; email: string } | null } | null;
  order?: {
    orderNumber: string;
    total: number;
    shipment?: {
      courierCharges: number | null;
      xelgoServiceCharge?: number | null;
      returnCourierCharges?: number | null;
      returnXelgoServiceCharge?: number | null;
      shippingMode: string;
    } | null;
  } | null;
}

interface PayoutSummary {
  totalGross: number;
  totalShippingCharges: number;
  totalXelgoServiceFee?: number;
  totalReturnDeductions?: number;
  totalCommission: number;
  commissionAdjustment: number;
  totalNetPayout: number;
  totalHeld?: number;
  count: number;
}

const SV: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'default'> = {
  PAID: 'success',
  APPROVED: 'info',
  PENDING: 'warning',
  ON_HOLD: 'default',
  REJECTED: 'danger',
};

const STATUS_OPTIONS = ['ON_HOLD', 'PENDING', 'APPROVED', 'PAID', 'REJECTED'] as const;

type PeriodPreset = 'all' | 'today' | 'monthly' | 'custom';

function sellerLabel(p: Payout): string {
  const s = p.seller;
  if (!s) return '—';
  if (s.storeName?.trim()) return s.storeName;
  if (s.user?.name?.trim()) return s.user.name;
  return s.user?.email ?? '—';
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color = 'text-primary-600',
  bgColor = 'bg-primary-50',
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
  bgColor?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex items-start gap-3">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', bgColor, color)}>
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-text-muted mb-0.5">{label}</p>
        <p className="text-lg font-bold text-text-primary truncate">
          {typeof value === 'number' ? formatCurrency(value) : value}
        </p>
      </div>
    </div>
  );
}

export default function PayoutsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Payout | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);

  // Date filter state
  const [period, setPeriod] = useState<PeriodPreset>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const params: Record<string, string> = {};
      if (period !== 'all') params.period = period;
      if (period === 'custom') {
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;
      }
      const res = await apiGetFull<{ data: Payout[]; summary: PayoutSummary }>('payouts', params);
      if (res?.summary) {
        setSummary(res.summary);
      }
    } catch {
      // Silent
    } finally {
      setLoadingSummary(false);
    }
  }, [period, dateFrom, dateTo]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary, refreshTrigger]);

  const openDetail = (r: Payout) => {
    setSelected(r);
    setNewStatus(r.status);
    setNote(r.note ?? '');
    setDetailOpen(true);
  };

  const handleUpdate = async () => {
    if (!selected) return;
    try {
      setUpdating(true);
      await apiUpdate('payouts', selected.id, {
        status: newStatus,
        note: note.trim() || undefined,
      });
      toast.success('Payout updated');
      setDetailOpen(false);
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleReleaseNow = async () => {
    if (!selected) return;
    if (!confirm('Force-release this settlement now? The seller wallet will be credited immediately.')) return;
    try {
      setUpdating(true);
      await apiPost(`payouts/${selected.id}/release`, {});
      toast.success('Payout released — wallet credited');
      setDetailOpen(false);
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Release failed');
    } finally {
      setUpdating(false);
    }
  };

  const handlePeriodChange = (p: PeriodPreset) => {
    setPeriod(p);
    if (p !== 'custom') {
      setDateFrom('');
      setDateTo('');
    }
    setRefreshTrigger((t) => t + 1);
  };

  const columns: Column<Payout>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (r) => <span className="font-mono text-xs font-medium text-primary-600">{r.id.slice(0, 8)}…</span>,
    },
    {
      key: 'seller',
      header: 'Seller',
      render: (r) => <span className="font-medium">{sellerLabel(r)}</span>,
    },
    {
      key: 'order',
      header: 'Order',
      render: (r) => (
        <span className="text-xs text-text-muted">
          {r.order?.orderNumber || '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Gross',
      render: (r) => <span className="font-semibold">{formatCurrency(r.amount)}</span>,
    },
    {
      key: 'shippingCharges',
      header: 'Shipping',
      render: (r) => {
        const charges = r.order?.shipment?.courierCharges;
        const isXelgo = r.order?.shipment?.shippingMode === 'XELNOVA_COURIER';
        if (!isXelgo || !charges) return <span className="text-text-muted">—</span>;
        return <span className="text-orange-600 font-medium">-{formatCurrency(charges)}</span>;
      },
    },
    {
      key: 'net',
      header: 'Net Payout',
      render: (r) => {
        const charges =
          r.order?.shipment?.shippingMode === 'XELNOVA_COURIER'
            ? (r.order.shipment.courierCharges ?? 0)
            : 0;
        return <span className="font-bold text-green-700">{formatCurrency(r.amount - charges)}</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge variant={SV[r.status] ?? 'default'}>
          {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    {
      key: 'requestedAt',
      header: 'Requested',
      render: (r) => (
        <span className="text-xs">{new Date(r.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      ),
    },
  ];

  const extraParams: Record<string, string> = {};
  if (period !== 'all') extraParams.period = period;
  if (period === 'custom') {
    if (dateFrom) extraParams.dateFrom = dateFrom;
    if (dateTo) extraParams.dateTo = dateTo;
  }

  return (
    <>
      {/* Date Filters + Summary */}
      <div className="mb-6 space-y-4">
        {/* Period selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-text-muted mr-1">Period:</span>
          {(
            [
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: 'monthly', label: 'This Month' },
              { value: 'custom', label: 'Custom' },
            ] as { value: PeriodPreset; label: string }[]
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handlePeriodChange(opt.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all border',
                period === opt.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-surface border-border text-text-muted hover:bg-surface-muted hover:text-text-primary',
              )}
            >
              {opt.label}
            </button>
          ))}

          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary-400 focus:outline-none"
              />
              <span className="text-xs text-text-muted">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setRefreshTrigger((t) => t + 1)}
                className="rounded-lg bg-primary-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-primary-700 transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        {loadingSummary ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={20} className="animate-spin text-text-muted" />
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <SummaryCard
              label="Gross Settled"
              value={summary.totalGross}
              icon={IndianRupee}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <SummaryCard
              label="Held (7-day window)"
              value={summary.totalHeld ?? 0}
              icon={CalendarDays}
              color="text-amber-600"
              bgColor="bg-amber-50"
            />
            <SummaryCard
              label="Xelgo Shipping"
              value={summary.totalShippingCharges}
              icon={Truck}
              color="text-orange-600"
              bgColor="bg-orange-50"
            />
            <SummaryCard
              label="Xelgo Service Fee"
              value={summary.totalXelgoServiceFee ?? 0}
              icon={DollarSign}
              color="text-purple-600"
              bgColor="bg-purple-50"
            />
            <SummaryCard
              label="Return Deductions"
              value={summary.totalReturnDeductions ?? 0}
              icon={Truck}
              color="text-red-600"
              bgColor="bg-red-50"
            />
            <SummaryCard
              label="Net Released"
              value={summary.totalNetPayout}
              icon={CalendarDays}
              color="text-green-600"
              bgColor="bg-green-50"
            />
          </div>
        ) : null}
      </div>

      <AdminListPage<Payout>
        title="Payouts"
        section="payouts"
        columns={columns}
        keyExtractor={(r) => r.id}
        searchKeys={['seller.storeName', 'seller.user.name', 'seller.user.email', 'id']}
        filterKey="status"
        filterOptions={[...STATUS_OPTIONS]}
        refreshTrigger={refreshTrigger}
        queryParams={extraParams}
        renderActions={(r) => (
          <button
            type="button"
            onClick={() => openDetail(r)}
            className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"
          >
            <Eye size={15} />
          </button>
        )}
      />

      <ActionModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selected ? `Payout ${selected.id.slice(0, 8)}…` : 'Payout'}
        wide
        onSubmit={handleUpdate}
        submitLabel="Update"
        loading={updating}
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-muted">Seller:</span>{' '}
                <span className="font-medium">{sellerLabel(selected)}</span>
              </div>
              <div>
                <span className="text-text-muted">Status:</span>{' '}
                <Badge variant={SV[selected.status] ?? 'default'}>
                  {selected.status.replace('_', ' ')}
                </Badge>
              </div>
              {selected.order && (
                <div>
                  <span className="text-text-muted">Order:</span>{' '}
                  <span className="font-medium">{selected.order.orderNumber}</span>
                </div>
              )}
              {selected.seller?.user?.email && (
                <div>
                  <span className="text-text-muted">Email:</span> {selected.seller.user.email}
                </div>
              )}
              <div>
                <span className="text-text-muted">Requested:</span> {new Date(selected.requestedAt).toLocaleString()}
              </div>
              <div>
                <span className="text-text-muted">Paid:</span>{' '}
                {selected.paidAt ? new Date(selected.paidAt).toLocaleString() : '—'}
              </div>
              {selected.holdUntil && (
                <div>
                  <span className="text-text-muted">Holds until:</span>{' '}
                  <span className="font-medium text-amber-700">
                    {new Date(selected.holdUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
              {selected.releasedAt && (
                <div>
                  <span className="text-text-muted">Released:</span>{' '}
                  <span className="font-medium">{new Date(selected.releasedAt).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-surface-muted/40 p-3 text-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Gross</span>
                <span className="font-medium">{formatCurrency(selected.gross ?? selected.amount)}</span>
              </div>
              {(selected.commission ?? 0) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Commission</span>
                  <span className="font-medium text-red-600">-{formatCurrency(selected.commission ?? 0)}</span>
                </div>
              )}
              {selected.order?.shipment?.shippingMode === 'XELNOVA_COURIER' && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Xelgo Shipping (debited at booking)</span>
                  <span className="font-medium text-orange-600">
                    -{formatCurrency(selected.order.shipment.courierCharges ?? 0)}
                  </span>
                </div>
              )}
              {(selected.xelgoServiceCharge ?? 0) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Xelgo Service Fee (₹30 flat)</span>
                  <span className="font-medium text-purple-600">-{formatCurrency(selected.xelgoServiceCharge ?? 0)}</span>
                </div>
              )}
              {((selected.order?.shipment?.returnCourierCharges ?? 0) + (selected.order?.shipment?.returnXelgoServiceCharge ?? 0)) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Return Deductions</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(
                      (selected.order?.shipment?.returnCourierCharges ?? 0) +
                        (selected.order?.shipment?.returnXelgoServiceCharge ?? 0),
                    )}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border pt-1.5">
                <span className="font-semibold">Net Payout (wallet credit)</span>
                <span className="font-bold text-green-700">{formatCurrency(selected.amount)}</span>
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <FormField label="Status">
                <FormSelect value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ')}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
              <FormField label="Note (internal)">
                <FormTextarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" />
              </FormField>

              {selected.status === 'ON_HOLD' && (
                <button
                  type="button"
                  onClick={handleReleaseNow}
                  disabled={updating}
                  className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Release now (skip remaining hold window)
                </button>
              )}
            </div>
          </div>
        )}
      </ActionModal>
    </>
  );
}
