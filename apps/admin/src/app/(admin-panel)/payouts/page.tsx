'use client';

import { useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { FormField, FormSelect } from '@/components/dashboard/form-field';
import { Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';

interface Payout {
  id: string; seller: string; amount: number; method: string;
  status: string; reference: string; requestedAt: string; processedAt: string | null;
}

const SV: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'default'> = {
  Completed: 'success', Pending: 'warning', Processing: 'info', Failed: 'danger',
};

export default function PayoutsPage() {
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Payout | null>(null);
  const [newStatus, setNewStatus] = useState('');

  const columns: Column<Payout>[] = [
    { key: 'reference', header: 'Reference', render: (r) => <span className="font-mono text-xs font-medium text-primary-600">{r.reference}</span> },
    { key: 'seller', header: 'Seller', render: (r) => <span className="font-medium">{r.seller}</span> },
    { key: 'amount', header: 'Amount', render: (r) => <span className="font-semibold">₹{r.amount.toLocaleString()}</span> },
    { key: 'method', header: 'Method' },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={SV[r.status] ?? 'default'}>{r.status}</Badge> },
    { key: 'requestedAt', header: 'Requested', render: (r) => new Date(r.requestedAt).toLocaleDateString() },
    { key: 'processedAt', header: 'Processed', render: (r) => r.processedAt ? new Date(r.processedAt).toLocaleDateString() : '—' },
  ];

  return (
    <>
      <AdminListPage<Payout> title="Payouts" section="payouts" columns={columns} keyExtractor={(r) => r.id}
        searchKeys={['seller', 'reference']} filterKey="status" filterOptions={['Completed', 'Pending', 'Processing', 'Failed']}
        renderActions={(r) => (
          <button onClick={() => { setSelected(r); setNewStatus(r.status); setDetailOpen(true); }} className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"><Eye size={15} /></button>
        )}
      />
      <ActionModal open={detailOpen} onClose={() => setDetailOpen(false)} title={`Payout ${selected?.reference}`} wide
        onSubmit={() => { toast.success(`Status updated to ${newStatus}`); setDetailOpen(false); }} submitLabel="Update">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-text-muted">Seller:</span> <span className="font-medium">{selected.seller}</span></div>
              <div><span className="text-text-muted">Amount:</span> <span className="font-semibold">₹{selected.amount.toLocaleString()}</span></div>
              <div><span className="text-text-muted">Method:</span> {selected.method}</div>
              <div><span className="text-text-muted">Requested:</span> {new Date(selected.requestedAt).toLocaleString()}</div>
            </div>
            <div className="border-t border-border pt-4">
              <FormField label="Status">
                <FormSelect value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  <option>Pending</option><option>Processing</option><option>Completed</option><option>Failed</option>
                </FormSelect>
              </FormField>
            </div>
          </div>
        )}
      </ActionModal>
    </>
  );
}
