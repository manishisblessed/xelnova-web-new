'use client';

import { useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormInput } from '@/components/dashboard/form-field';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';

interface Brand { id: string; name: string; slug: string; productCount: number; verified: boolean; createdAt: string; }

export default function BrandsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState({ name: '', slug: '' });

  const openAdd = () => { setEditing(null); setForm({ name: '', slug: '' }); setModalOpen(true); };
  const openEdit = (b: Brand) => { setEditing(b); setForm({ name: b.name, slug: b.slug }); setModalOpen(true); };

  const columns: Column<Brand>[] = [
    { key: 'name', header: 'Brand', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'slug', header: 'Slug', render: (r) => <span className="font-mono text-xs text-text-muted">{r.slug}</span> },
    { key: 'productCount', header: 'Products' },
    { key: 'verified', header: 'Verified', render: (r) => <Badge variant={r.verified ? 'success' : 'default'}>{r.verified ? 'Yes' : 'No'}</Badge> },
  ];

  return (
    <>
      <AdminListPage<Brand> title="Brands" section="brands" columns={columns} keyExtractor={(r) => r.id} searchKeys={['name']} onAdd={openAdd} addLabel="Add Brand"
        renderActions={(r) => (
          <div className="flex items-center gap-1">
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"><Pencil size={15} /></button>
            <button onClick={() => { setEditing(r); setDeleteOpen(true); }} className="p-1.5 rounded-lg hover:bg-danger-50 text-text-muted hover:text-danger-600"><Trash2 size={15} /></button>
          </div>
        )}
      />
      <ActionModal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Brand' : 'Add Brand'} onSubmit={() => { toast.success(editing ? 'Brand updated' : 'Brand created'); setModalOpen(false); }}>
        <FormField label="Name"><FormInput value={form.name} onChange={e => setForm({ name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-') })} /></FormField>
        <FormField label="Slug"><FormInput value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} /></FormField>
      </ActionModal>
      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={() => { toast.success('Brand deleted'); setDeleteOpen(false); }} title="Delete Brand" message={`Delete "${editing?.name}"?`} />
    </>
  );
}
