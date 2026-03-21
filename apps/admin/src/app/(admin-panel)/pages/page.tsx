'use client';

import { useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormInput, FormSelect, FormTextarea } from '@/components/dashboard/form-field';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';

interface CmsPage { id: string; title: string; slug: string; status: string; updatedAt: string; }

export default function CmsPagesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<CmsPage | null>(null);
  const [form, setForm] = useState({ title: '', slug: '', status: 'Published', content: '' });

  const openAdd = () => { setEditing(null); setForm({ title: '', slug: '', status: 'Published', content: '' }); setModalOpen(true); };
  const openEdit = (p: CmsPage) => { setEditing(p); setForm({ title: p.title, slug: p.slug, status: p.status, content: '' }); setModalOpen(true); };

  const columns: Column<CmsPage>[] = [
    { key: 'title', header: 'Title', render: (r) => <span className="font-medium">{r.title}</span> },
    { key: 'slug', header: 'Slug', render: (r) => <span className="font-mono text-xs text-text-muted">/{r.slug}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'Published' ? 'success' : 'default'}>{r.status}</Badge> },
    { key: 'updatedAt', header: 'Updated', render: (r) => new Date(r.updatedAt).toLocaleDateString() },
  ];

  return (
    <>
      <AdminListPage<CmsPage> title="CMS Pages" section="pages" columns={columns} keyExtractor={(r) => r.id}
        searchKeys={['title', 'slug']} filterKey="status" filterOptions={['Published', 'Draft']}
        onAdd={openAdd} addLabel="Create Page"
        renderActions={(r) => (
          <div className="flex items-center gap-1">
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"><Pencil size={15} /></button>
            <button onClick={() => { setEditing(r); setDeleteOpen(true); }} className="p-1.5 rounded-lg hover:bg-danger-50 text-text-muted hover:text-danger-600"><Trash2 size={15} /></button>
          </div>
        )}
      />
      <ActionModal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Page' : 'Create Page'} wide
        onSubmit={() => { toast.success(editing ? 'Page updated' : 'Page created'); setModalOpen(false); }}>
        <FormField label="Title"><FormInput value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-') }))} /></FormField>
        <FormField label="Slug"><FormInput value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} /></FormField>
        <FormField label="Status"><FormSelect value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}><option>Published</option><option>Draft</option></FormSelect></FormField>
        <FormField label="Content"><FormTextarea rows={6} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Page content..." /></FormField>
      </ActionModal>
      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={() => { toast.success('Page deleted'); setDeleteOpen(false); }} title="Delete Page" message={`Delete "${editing?.title}"?`} />
    </>
  );
}
