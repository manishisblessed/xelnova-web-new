'use client';

import { useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormInput, FormSelect } from '@/components/dashboard/form-field';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';

interface FlashDeal {
  id: string; title: string; discount: string; products: number;
  sold: number; status: string; startsAt: string; endsAt: string;
}

const SV: Record<string, 'success' | 'warning' | 'danger' | 'default'> = { Active: 'success', Scheduled: 'warning', Expired: 'danger' };

export default function FlashDealsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<FlashDeal | null>(null);
  const [form, setForm] = useState({ title: '', discount: '', status: 'Active' });

  const openAdd = () => { setEditing(null); setForm({ title: '', discount: '', status: 'Active' }); setModalOpen(true); };
  const openEdit = (d: FlashDeal) => { setEditing(d); setForm({ title: d.title, discount: d.discount, status: d.status }); setModalOpen(true); };

  const columns: Column<FlashDeal>[] = [
    { key: 'title', header: 'Deal', render: (r) => <span className="font-medium">{r.title}</span> },
    { key: 'discount', header: 'Discount', render: (r) => <span className="font-semibold text-danger-600">{r.discount}</span> },
    { key: 'products', header: 'Products' },
    { key: 'sold', header: 'Sold' },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={SV[r.status] ?? 'default'}>{r.status}</Badge> },
    { key: 'startsAt', header: 'Starts', render: (r) => new Date(r.startsAt).toLocaleDateString() },
    { key: 'endsAt', header: 'Ends', render: (r) => new Date(r.endsAt).toLocaleDateString() },
  ];

  return (
    <>
      <AdminListPage<FlashDeal> title="Flash Deals" section="flash-deals" columns={columns} keyExtractor={(r) => r.id}
        searchKeys={['title']} filterKey="status" filterOptions={['Active', 'Scheduled', 'Expired']}
        onAdd={openAdd} addLabel="Create Deal"
        renderActions={(r) => (
          <div className="flex items-center gap-1">
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"><Pencil size={15} /></button>
            <button onClick={() => { setEditing(r); setDeleteOpen(true); }} className="p-1.5 rounded-lg hover:bg-danger-50 text-text-muted hover:text-danger-600"><Trash2 size={15} /></button>
          </div>
        )}
      />
      <ActionModal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Deal' : 'Create Deal'} onSubmit={() => { toast.success(editing ? 'Deal updated' : 'Deal created'); setModalOpen(false); }}>
        <FormField label="Title"><FormInput value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></FormField>
        <FormField label="Discount"><FormInput value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} placeholder="e.g. 30%" /></FormField>
        <FormField label="Status"><FormSelect value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}><option>Active</option><option>Scheduled</option><option>Expired</option></FormSelect></FormField>
      </ActionModal>
      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={() => { toast.success('Deal deleted'); setDeleteOpen(false); }} title="Delete Flash Deal" message={`Delete "${editing?.title}"?`} />
    </>
  );
}
