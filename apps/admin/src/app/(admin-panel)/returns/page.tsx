'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@xelnova/ui';
import { ActionModal } from '@/components/dashboard/action-modal';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { FormField, FormInput, FormSelect, FormTextarea } from '@/components/dashboard/form-field';
import {
  Eye, RotateCcw, RefreshCw, Search, Truck, Package,
  CheckCircle, XCircle, Loader2, Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiGetReturns, apiUpdateReturnStatus, apiScheduleReversePickup } from '@/lib/api';
import { motion } from 'framer-motion';

// ─── Types ───

interface ReturnRequest {
  id: string;
  kind: 'RETURN' | 'REPLACEMENT';
  reasonCode: string | null;
  reason: string;
  description: string | null;
  imageUrls: string[];
  status: string;
  adminNote: string | null;
  refundAmount: number | null;
  reverseCourier: string | null;
  reverseAwb: string | null;
  reverseTrackingUrl: string | null;
  reversePickupScheduled: string | null;
  reversePickedUpAt: string | null;
  reverseCourierCharge: number | null;
  createdAt: string;
  updatedAt: string;
  order: {
    orderNumber: string;
    total: number;
    status: string;
  };
  user: {
    name: string;
    email: string;
  };
}

interface ReturnListResponse {
  requests: ReturnRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Constants ───

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

const RETURN_STATUSES = ['REQUESTED', 'APPROVED', 'REJECTED', 'PICKED_UP', 'REFUNDED'] as const;

const ADMIN_TRANSITION_OPTIONS: Record<string, string[]> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['PICKED_UP', 'REFUNDED', 'REJECTED'],
  PICKED_UP: ['REFUNDED'],
  REJECTED: [],
  REFUNDED: [],
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

// ─── Page ───

export default function ReturnsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<ReturnRequest | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [updating, setUpdating] = useState(false);

  const [pickupOpen, setPickupOpen] = useState(false);
  const [pickupCourier, setPickupCourier] = useState('');
  const [pickupAwb, setPickupAwb] = useState('');
  const [pickupTrackingUrl, setPickupTrackingUrl] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupSaving, setPickupSaving] = useState(false);

  const handledDeepLinkRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await apiGetReturns<ReturnListResponse>(1, 200);
      setData(result.requests ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load return requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Deep-link: /returns?returnRequestId=...
  useEffect(() => {
    if (handledDeepLinkRef.current) return;
    const targetId = searchParams.get('returnRequestId');
    const targetOrder = searchParams.get('orderNumber');
    if (!targetId && !targetOrder) return;
    handledDeepLinkRef.current = true;
    router.replace(pathname, { scroll: false });
    if (data.length === 0) return;
    const match = targetId
      ? data.find((r) => r.id === targetId)
      : data.find((r) => r.order.orderNumber === targetOrder);
    if (match) openDetail(match);
    else toast.error('Return request not found.');
  }, [searchParams, data, router, pathname]);

  const openDetail = (req: ReturnRequest) => {
    setSelected(req);
    setNewStatus(req.status);
    setAdminNote(req.adminNote ?? '');
    setRefundAmount(req.refundAmount != null ? String(req.refundAmount) : String(req.order.total));
    setDetailOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selected || !newStatus) return;
    if (newStatus === selected.status) {
      toast.info('No status change selected.');
      return;
    }
    setUpdating(true);
    try {
      const body: { status: string; adminNote?: string; refundAmount?: number } = {
        status: newStatus,
      };
      if (adminNote.trim()) body.adminNote = adminNote.trim();
      if (newStatus === 'REFUNDED' && refundAmount) {
        body.refundAmount = Number(refundAmount);
      }
      await apiUpdateReturnStatus(selected.id, body);
      toast.success(`Request updated to ${prettyStatus(newStatus)}`);
      setDetailOpen(false);
      void fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const openPickupModal = () => {
    if (!selected) return;
    setPickupCourier(selected.reverseCourier ?? '');
    setPickupAwb(selected.reverseAwb ?? '');
    setPickupTrackingUrl(selected.reverseTrackingUrl ?? '');
    setPickupDate(
      selected.reversePickupScheduled
        ? selected.reversePickupScheduled.split('T')[0]
        : new Date(Date.now() + 86400000).toISOString().split('T')[0],
    );
    setPickupOpen(true);
  };

  const handleSchedulePickup = async () => {
    if (!selected || !pickupCourier.trim()) return;
    setPickupSaving(true);
    try {
      await apiScheduleReversePickup(selected.id, {
        courier: pickupCourier.trim(),
        awb: pickupAwb.trim() || undefined,
        trackingUrl: pickupTrackingUrl.trim() || undefined,
        pickupDate: pickupDate || undefined,
      });
      toast.success('Reverse pickup scheduled');
      setPickupOpen(false);
      void fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule pickup');
    } finally {
      setPickupSaving(false);
    }
  };

  // Client-side filtering
  const filtered = data.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (kindFilter && r.kind !== kindFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.order.orderNumber.toLowerCase().includes(q) ||
        r.user.name.toLowerCase().includes(q) ||
        r.user.email.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const transitions = selected ? ADMIN_TRANSITION_OPTIONS[selected.status] ?? [] : [];

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
                        <p className="font-medium text-text-primary">{r.user.name}</p>
                        <p className="text-xs text-text-muted">{r.user.email}</p>
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
                        onClick={() => openDetail(r)}
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

      {/* Detail / action modal */}
      <ActionModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={
          selected
            ? `${selected.kind === 'REPLACEMENT' ? 'Replacement' : 'Return'} — ${selected.order.orderNumber}`
            : 'Return Request'
        }
        wide
        onSubmit={transitions.length > 0 ? () => void handleUpdateStatus() : undefined}
        submitLabel={newStatus ? `Mark as ${prettyStatus(newStatus)}` : 'Update'}
        loading={updating}
        submitDisabled={!newStatus || newStatus === selected?.status}
        submitDisabledReason="Select a new status"
      >
        {selected && (
          <div className="space-y-4">
            {/* Summary grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-text-muted mb-0.5">Customer</p>
                <p className="font-semibold text-text-primary">{selected.user.name}</p>
                <p className="text-text-muted text-xs">{selected.user.email}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-0.5">Order total</p>
                <p className="text-xl font-bold text-text-primary">₹{selected.order.total.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-0.5">Order status</p>
                <p className="font-medium text-text-primary">{prettyStatus(selected.order.status)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-0.5">Type</p>
                <Badge variant={KIND_VARIANT[selected.kind] ?? 'default'}>
                  {selected.kind === 'REPLACEMENT' ? 'Replacement' : 'Return'}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-0.5">Request status</p>
                <Badge variant={STATUS_VARIANT[selected.status] ?? 'default'}>
                  {prettyStatus(selected.status)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-0.5">Requested on</p>
                <p className="font-medium text-text-primary">{new Date(selected.createdAt).toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Reason */}
            <div className="border-t border-border pt-4 space-y-2">
              <h3 className="text-sm font-semibold text-text-primary">Customer&apos;s reason</h3>
              <div className="rounded-xl border border-border bg-surface-muted/30 p-3 text-sm space-y-1">
                <p>
                  <span className="text-text-muted text-xs">Code:</span>{' '}
                  <span className="font-medium text-text-primary">{prettyReason(selected.reasonCode)}</span>
                </p>
                {selected.reason && (
                  <p className="text-text-secondary">{selected.reason}</p>
                )}
                {selected.description && (
                  <p className="text-text-secondary italic">{selected.description}</p>
                )}
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
            {(selected.status === 'APPROVED' || selected.status === 'PICKED_UP') && (
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                    <Truck size={14} /> Reverse pickup
                  </h3>
                  <button
                    type="button"
                    onClick={openPickupModal}
                    className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                  >
                    {selected.reverseCourier ? 'Edit pickup' : 'Schedule pickup'}
                  </button>
                </div>
                {selected.reverseCourier ? (
                  <div className="rounded-xl border border-border bg-surface-muted/30 p-3 text-sm space-y-1">
                    <p><span className="text-text-muted">Courier:</span> <span className="font-medium">{selected.reverseCourier}</span></p>
                    {selected.reverseAwb && <p><span className="text-text-muted">AWB:</span> <span className="font-mono font-medium">{selected.reverseAwb}</span></p>}
                    {selected.reversePickupScheduled && (
                      <p><span className="text-text-muted">Scheduled:</span> {new Date(selected.reversePickupScheduled).toLocaleDateString('en-IN')}</p>
                    )}
                    {selected.reverseCourierCharge != null && selected.reverseCourierCharge > 0 && (
                      <p><span className="text-text-muted">Courier charge (seller debit):</span> <span className="font-semibold text-danger-600">₹{selected.reverseCourierCharge}</span></p>
                    )}
                    {selected.reversePickedUpAt && (
                      <p className="text-success-700 font-medium">Picked up on {new Date(selected.reversePickedUpAt).toLocaleDateString('en-IN')}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">No reverse pickup scheduled yet. Click above to set one up.</p>
                )}
              </div>
            )}

            {/* Admin note */}
            {selected.adminNote && (
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-text-primary mb-1">Admin note</h3>
                <p className="text-sm text-text-secondary bg-amber-50 border border-amber-200 rounded-xl p-3">{selected.adminNote}</p>
              </div>
            )}

            {/* Status transition */}
            {transitions.length > 0 && (
              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-text-primary">Update status</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="New status">
                    <FormSelect value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                      <option value={selected.status}>{prettyStatus(selected.status)} (current)</option>
                      {transitions.map((s) => (
                        <option key={s} value={s}>{prettyStatus(s)}</option>
                      ))}
                    </FormSelect>
                  </FormField>
                  {newStatus === 'REFUNDED' && selected.kind === 'RETURN' && (
                    <FormField label="Refund amount (₹)">
                      <FormInput
                        type="number"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        placeholder={String(selected.order.total)}
                        min={0}
                      />
                    </FormField>
                  )}
                </div>
                <FormField label="Admin note (optional)">
                  <FormTextarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Internal note — visible to support but not the customer"
                    rows={2}
                  />
                </FormField>
              </div>
            )}

            {/* Terminal states */}
            {transitions.length === 0 && (
              <div className="border-t border-border pt-4">
                <p className="text-sm text-text-muted">
                  This request is in a terminal state (<strong>{prettyStatus(selected.status)}</strong>). No further actions available.
                </p>
              </div>
            )}
          </div>
        )}
      </ActionModal>

      {/* Reverse pickup modal */}
      <ActionModal
        open={pickupOpen}
        onClose={() => setPickupOpen(false)}
        title="Schedule Reverse Pickup"
        onSubmit={() => void handleSchedulePickup()}
        submitLabel="Schedule"
        loading={pickupSaving}
        submitDisabled={!pickupCourier.trim()}
        submitDisabledReason="Courier name is required"
      >
        <div className="space-y-3">
          <FormField label="Courier *">
            <FormInput
              value={pickupCourier}
              onChange={(e) => setPickupCourier(e.target.value)}
              placeholder="e.g. Delhivery, BlueDart, Xelnova Reverse"
            />
          </FormField>
          <FormField label="AWB / Tracking #">
            <FormInput
              value={pickupAwb}
              onChange={(e) => setPickupAwb(e.target.value)}
              placeholder="Optional"
            />
          </FormField>
          <FormField label="Tracking URL">
            <FormInput
              value={pickupTrackingUrl}
              onChange={(e) => setPickupTrackingUrl(e.target.value)}
              placeholder="https://..."
            />
          </FormField>
          <FormField label="Pickup date">
            <FormInput
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
            />
          </FormField>
        </div>
      </ActionModal>
    </>
  );
}
