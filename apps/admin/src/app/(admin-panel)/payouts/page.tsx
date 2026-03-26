'use client';

import { useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { FormField, FormSelect, FormTextarea } from '@/components/dashboard/form-field';
import { Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';
import { apiUpdate } from '@/lib/api';

interface Payout {
  id: string;
  amount: number;
  status: string;
  note: string | null;
  requestedAt: string;
  paidAt: string | null;
  seller: { storeName: string; user: { name: string; email: string } | null } | null;
}

const SV: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'default'> = {
  PAID: 'success',
  APPROVED: 'info',
  PENDING: 'warning',
  REJECTED: 'danger',
};

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'PAID', 'REJECTED'] as const;

function sellerLabel(p: Payout): string {
  const s = p.seller;
  if (!s) return '—';
  if (s.storeName?.trim()) return s.storeName;
  if (s.user?.name?.trim()) return s.user.name;
  return s.user?.email ?? '—';
}

export default function PayoutsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Payout | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);

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
    { key: 'amount', header: 'Amount', render: (r) => <span className="font-semibold">₹{r.amount.toLocaleString()}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={SV[r.status] ?? 'default'}>{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</Badge> },
    { key: 'requestedAt', header: 'Requested', render: (r) => new Date(r.requestedAt).toLocaleString() },
    {
      key: 'paidAt',
      header: 'Paid',
      render: (r) => (r.paidAt ? new Date(r.paidAt).toLocaleString() : '—'),
    },
  ];

  return (
    <>
      <AdminListPage<Payout>
        title="Payouts"
        section="payouts"
        columns={columns}
        keyExtractor={(r) => r.id}
        searchKeys={['seller.storeName', 'seller.user.name', 'seller.user.email', 'id']}
        filterKey="status"
        filterOptions={[...STATUS_OPTIONS]}
        refreshTrigger={refreshTrigger}
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
                <span className="text-text-muted">Amount:</span>{' '}
                <span className="font-semibold">₹{selected.amount.toLocaleString()}</span>
              </div>
              {selected.seller?.user?.email && (
                <div className="col-span-2">
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
            </div>
            <div className="border-t border-border pt-4 space-y-4">
              <FormField label="Status">
                <FormSelect value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
              <FormField label="Note (internal)">
                <FormTextarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" />
              </FormField>
            </div>
          </div>
        )}
      </ActionModal>
    </>
  );
}
