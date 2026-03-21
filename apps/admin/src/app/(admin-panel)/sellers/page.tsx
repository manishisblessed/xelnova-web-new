'use client';

import { useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormInput, FormSelect } from '@/components/dashboard/form-field';
import { Pencil, Eye, Ban } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';

interface Seller {
  id: string; storeName: string; ownerName: string; email: string;
  products: number; totalSales: number; commission: number; verified: boolean; status: string; joinedAt: string;
}

const SV: Record<string, 'success' | 'warning' | 'danger' | 'default'> = { Active: 'success', Pending: 'warning', Suspended: 'danger' };

export default function SellersPage() {
  const [detailOpen, setDetailOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [selected, setSelected] = useState<Seller | null>(null);

  const columns: Column<Seller>[] = [
    { key: 'storeName', header: 'Store', render: (r) => <span className="font-medium">{r.storeName}</span> },
    { key: 'ownerName', header: 'Owner' },
    { key: 'email', header: 'Email' },
    { key: 'products', header: 'Products' },
    { key: 'totalSales', header: 'Sales', render: (r) => `₹${r.totalSales.toLocaleString()}` },
    { key: 'commission', header: 'Comm %', render: (r) => `${r.commission}%` },
    { key: 'verified', header: 'Verified', render: (r) => <Badge variant={r.verified ? 'success' : 'default'}>{r.verified ? 'Yes' : 'No'}</Badge> },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={SV[r.status] ?? 'default'}>{r.status}</Badge> },
  ];

  return (
    <>
      <AdminListPage<Seller> title="Sellers" section="sellers" columns={columns} keyExtractor={(r) => r.id}
        searchKeys={['storeName', 'ownerName', 'email']} filterKey="status" filterOptions={['Active', 'Pending', 'Suspended']}
        renderActions={(r) => (
          <div className="flex items-center gap-1">
            <button onClick={() => { setSelected(r); setDetailOpen(true); }} className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"><Eye size={15} /></button>
            {r.status !== 'Suspended' && <button onClick={() => { setSelected(r); setSuspendOpen(true); }} className="p-1.5 rounded-lg hover:bg-danger-50 text-text-muted hover:text-danger-600"><Ban size={15} /></button>}
          </div>
        )}
      />
      <ActionModal open={detailOpen} onClose={() => setDetailOpen(false)} title={selected?.storeName ?? 'Seller'} wide>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-text-muted">Owner:</span> {selected.ownerName}</div>
              <div><span className="text-text-muted">Email:</span> {selected.email}</div>
              <div><span className="text-text-muted">Products:</span> {selected.products}</div>
              <div><span className="text-text-muted">Total Sales:</span> ₹{selected.totalSales.toLocaleString()}</div>
              <div><span className="text-text-muted">Commission Rate:</span> {selected.commission}%</div>
              <div><span className="text-text-muted">Verified:</span> {selected.verified ? 'Yes' : 'No'}</div>
              <div><span className="text-text-muted">Status:</span> <Badge variant={SV[selected.status] ?? 'default'}>{selected.status}</Badge></div>
              <div><span className="text-text-muted">Joined:</span> {new Date(selected.joinedAt).toLocaleDateString()}</div>
            </div>
          </div>
        )}
      </ActionModal>
      <ConfirmDialog open={suspendOpen} onClose={() => setSuspendOpen(false)} onConfirm={() => { toast.success(`${selected?.storeName} suspended`); setSuspendOpen(false); }}
        title="Suspend Seller" message={`Suspend "${selected?.storeName}"? They won't be able to sell until reactivated.`} />
    </>
  );
}
