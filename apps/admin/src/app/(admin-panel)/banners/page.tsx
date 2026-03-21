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

interface Banner {
  id: string; title: string; subtitle: string; position: string;
  isActive: boolean; clicks: number; sortOrder: number; startDate: string; endDate: string;
}

export default function BannersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState({ title: '', subtitle: '', position: 'Hero', sortOrder: '1' });

  const openAdd = () => { setEditing(null); setForm({ title: '', subtitle: '', position: 'Hero', sortOrder: '1' }); setModalOpen(true); };
  const openEdit = (b: Banner) => { setEditing(b); setForm({ title: b.title, subtitle: b.subtitle, position: b.position, sortOrder: String(b.sortOrder) }); setModalOpen(true); };

  const columns: Column<Banner>[] = [
    { key: 'title', header: 'Title', render: (r) => <span className="font-medium">{r.title}</span> },
    { key: 'subtitle', header: 'Subtitle' },
    { key: 'position', header: 'Position', render: (r) => <Badge variant="info">{r.position}</Badge> },
    { key: 'isActive', header: 'Active', render: (r) => <Badge variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Yes' : 'No'}</Badge> },
    { key: 'clicks', header: 'Clicks', render: (r) => r.clicks.toLocaleString() },
    { key: 'sortOrder', header: 'Order' },
    { key: 'endDate', header: 'Expires', render: (r) => new Date(r.endDate).toLocaleDateString() },
  ];

  return (
    <>
      <AdminListPage<Banner> title="Banners" section="banners" columns={columns} keyExtractor={(r) => r.id}
        searchKeys={['title']} onAdd={openAdd} addLabel="Add Banner"
        renderActions={(r) => (
          <div className="flex items-center gap-1">
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"><Pencil size={15} /></button>
            <button onClick={() => { setEditing(r); setDeleteOpen(true); }} className="p-1.5 rounded-lg hover:bg-danger-50 text-text-muted hover:text-danger-600"><Trash2 size={15} /></button>
          </div>
        )}
      />
      <ActionModal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Banner' : 'Add Banner'} onSubmit={() => { toast.success(editing ? 'Banner updated' : 'Banner created'); setModalOpen(false); }}>
        <FormField label="Title"><FormInput value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></FormField>
        <FormField label="Subtitle"><FormInput value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} /></FormField>
        <FormField label="Position"><FormSelect value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}><option>Hero</option><option>Category</option><option>Footer</option><option>Sidebar</option></FormSelect></FormField>
        <FormField label="Sort Order"><FormInput type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} /></FormField>
      </ActionModal>
      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={() => { toast.success('Banner deleted'); setDeleteOpen(false); }} title="Delete Banner" message={`Delete "${editing?.title}"?`} />
    </>
  );
}
