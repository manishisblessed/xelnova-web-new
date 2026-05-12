'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@xelnova/ui';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import {
  Eye, RotateCcw, RefreshCw, Search, Truck, Package,
  CheckCircle, XCircle, Loader2, Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiGetSellerReturns, type SellerReturnRequest } from '@/lib/api';
import { motion } from 'framer-motion';

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'default'> = {
  REQUESTED: 'warning',
  APPROVED: 'info',
  REJECTED: 'danger',
  PICKED_UP: 'info',
  REFUNDED: 'success',
};

const KIND_VARIANT: Record<string, 'info' | 'warning'> = {
  RETURN: 'warning',
  REPLACEMENT: 'info',
};

function prettyStatus(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ');
}

function prettyReason(code: string | null) {
  if (!code) return '—';
  const map: Record<string, string> = {
    DEFECTIVE: 'Damaged / defective',
    WRONG_ITEM: 'Wrong item received',
    NOT_AS_DESCRIBED: 'Not as described',
    SIZE_FIT: 'Size / fit issue',
    CHANGED_MIND: 'Changed mind',
    OTHER: 'Other',
  };
  return map[code] ?? code;
}

export default function SellerReturnsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState<SellerReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [selected, setSelected] = useState<SellerReturnRequest | null>(null);

  const handledDeepLinkRef = useRef(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await apiGetSellerReturns();
      setData(result ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load return requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  useEffect(() => {
    if (handledDeepLinkRef.current) return;
    const targetOrder = searchParams.get('orderNumber');
    if (!targetOrder) return;
    handledDeepLinkRef.current = true;
    router.replace(pathname, { scroll: false });
    if (data.length === 0) return;
    const match = data.find((r) => r.order.orderNumber === targetOrder);
    if (match) setSelected(match);
    else toast.error('Return request not found for that order.');
  }, [searchParams, data, router, pathname]);

  const filtered = data.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (kindFilter && r.kind !== kindFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.order.orderNumber.toLowerCase().includes(q) ||
        (r.user?.name || '').toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const RETURN_STATUSES = ['REQUESTED', 'APPROVED', 'REJECTED', 'PICKED_UP', 'REFUNDED'] as const;

  return (
    <>
      <DashboardHeader title="Returns & Replacements" />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order #, customer…"
              className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary"
          >
            <option value="">All statuses</option>
            {RETURN_STATUSES.map((s) => (
              <option key={s} value={s}>{prettyStatus(s)}</option>
            ))}
          </select>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary"
          >
            <option value="">All types</option>
            <option value="RETURN">Return</option>
            <option value="REPLACEMENT">Replacement</option>
          </select>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="p-2 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-text-muted text-sm">
            No return or replacement requests found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/40">
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Order</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Reason</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-primary">Date</th>
                  <th className="px-4 py-3 text-right font-semibold text-text-primary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium text-primary-600">{r.order.orderNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-text-primary">{r.user?.name || '—'}</p>
                        <p className="text-xs text-text-muted">{r.user?.email || ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={KIND_VARIANT[r.kind] ?? 'default'}>
                        {r.kind === 'REPLACEMENT' ? 'Replacement' : 'Return'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-secondary max-w-[180px] truncate">
                      {prettyReason(r.reasonCode)}
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary">
                      ₹{(r.refundAmount ?? r.order.total).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[r.status] ?? 'default'}>
                        {prettyStatus(r.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(r)}
                        className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600 transition-colors"
                        title="View details"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (
          <p className="text-xs text-text-muted text-right">
            {filtered.length} of {data.length} request(s)
          </p>
        )}
      </motion.div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 my-8"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">
                {selected.kind === 'REPLACEMENT' ? 'Replacement' : 'Return'} — {selected.order.orderNumber}
              </h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-text-muted mb-0.5">Customer</p>
                <p className="font-semibold text-text-primary">{selected.user?.name || '—'}</p>
                <p className="text-text-muted text-xs">{selected.user?.email || ''}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-0.5">Order total</p>
                <p className="text-xl font-bold text-text-primary">₹{selected.order.total.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-0.5">Type</p>
                <Badge variant={KIND_VARIANT[selected.kind] ?? 'default'}>
                  {selected.kind === 'REPLACEMENT' ? 'Replacement' : 'Return'}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-0.5">Status</p>
                <Badge variant={STATUS_VARIANT[selected.status] ?? 'default'}>
                  {prettyStatus(selected.status)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-0.5">Requested on</p>
                <p className="font-medium text-text-primary">{new Date(selected.createdAt).toLocaleString('en-IN')}</p>
              </div>
              {selected.refundAmount != null && (
                <div>
                  <p className="text-xs text-text-muted mb-0.5">Refund amount</p>
                  <p className="font-bold text-text-primary">₹{selected.refundAmount.toLocaleString('en-IN')}</p>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="border-t border-border pt-4 space-y-2">
              <h4 className="text-sm font-semibold text-text-primary">Customer&apos;s reason</h4>
              <div className="rounded-xl border border-border bg-surface-muted/30 p-3 text-sm space-y-1">
                <p>
                  <span className="text-text-muted text-xs">Code:</span>{' '}
                  <span className="font-medium text-text-primary">{prettyReason(selected.reasonCode)}</span>
                </p>
                {selected.reason && <p className="text-text-secondary">{selected.reason}</p>}
                {selected.description && <p className="text-text-secondary italic">{selected.description}</p>}
              </div>
              {selected.imageUrls.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {selected.imageUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Evidence ${i + 1}`} className="h-20 w-20 rounded-lg object-cover border border-border hover:border-primary-400 transition-colors" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Reverse pickup info */}
            {selected.reverseCourier && (
              <div className="border-t border-border pt-4 space-y-2">
                <h4 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                  <Truck size={14} /> Reverse Pickup
                </h4>
                <div className="rounded-xl border border-border bg-surface-muted/30 p-3 text-sm space-y-1">
                  <p><span className="text-text-muted">Courier:</span> <span className="font-medium">{selected.reverseCourier}</span></p>
                  {selected.reverseAwb && <p><span className="text-text-muted">AWB:</span> <span className="font-mono font-medium">{selected.reverseAwb}</span></p>}
                  {selected.reversePickupScheduled && (
                    <p><span className="text-text-muted">Scheduled:</span> {new Date(selected.reversePickupScheduled).toLocaleDateString('en-IN')}</p>
                  )}
                  {selected.reverseCourierCharge != null && selected.reverseCourierCharge > 0 && (
                    <p><span className="text-text-muted">Courier charge:</span> <span className="font-semibold text-danger-600">₹{selected.reverseCourierCharge}</span></p>
                  )}
                  {selected.reversePickedUpAt && (
                    <p className="text-success-700 font-medium">
                      <CheckCircle size={12} className="inline mr-1" />
                      Picked up on {new Date(selected.reversePickedUpAt).toLocaleDateString('en-IN')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Admin note */}
            {selected.adminNote && (
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-text-primary mb-1">Admin note</h4>
                <p className="text-sm text-text-secondary bg-amber-50 border border-amber-200 rounded-xl p-3">{selected.adminNote}</p>
              </div>
            )}

            <div className="border-t border-border pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
