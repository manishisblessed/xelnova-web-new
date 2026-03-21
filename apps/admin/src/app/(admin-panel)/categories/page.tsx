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

interface Category { id: string; name: string; slug: string; productCount: number; status: string; createdAt: string; }

export default function CategoriesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', status: 'Active' });

  const openAdd = () => { setEditing(null); setForm({ name: '', slug: '', status: 'Active' }); setModalOpen(true); };
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, slug: c.slug, status: c.status }); setModalOpen(true); };
  const handleSave = () => { toast.success(editing ? 'Category updated' : 'Category created'); setModalOpen(false); };
  const handleDelete = () => { toast.success('Category deleted'); setDeleteOpen(false); };

  const columns: Column<Category>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'slug', header: 'Slug', render: (r) => <span className="font-mono text-xs text-text-muted">{r.slug}</span> },
    { key: 'productCount', header: 'Products' },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'Active' ? 'success' : 'default'}>{r.status}</Badge> },
  ];

  return (
    <>
      <AdminListPage<Category> title="Categories" section="categories" columns={columns} keyExtractor={(r) => r.id} searchKeys={['name']} filterKey="status" filterOptions={['Active', 'Hidden']} onAdd={openAdd} addLabel="Add Category"
        renderActions={(r) => (
          <div className="flex items-center gap-1">
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"><Pencil size={15} /></button>
            <button onClick={() => { setEditing(r); setDeleteOpen(true); }} className="p-1.5 rounded-lg hover:bg-danger-50 text-text-muted hover:text-danger-600"><Trash2 size={15} /></button>
          </div>
        )}
      />
      <ActionModal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : 'Add Category'} onSubmit={handleSave}>
        <FormField label="Name"><FormInput value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-') }))} /></FormField>
        <FormField label="Slug"><FormInput value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} /></FormField>
        <FormField label="Status"><FormSelect value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}><option>Active</option><option>Hidden</option></FormSelect></FormField>
      </ActionModal>
      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} title="Delete Category" message={`Delete "${editing?.name}"?`} />
    </>
  );
}
