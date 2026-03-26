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
import { apiCreate, apiUpdate, apiDelete } from '@/lib/api';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image: string | null;
  link: string | null;
  isActive: boolean;
  sortOrder: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

function bannerLink(b: Banner & { ctaLink?: string | null }) {
  return b.link ?? b.ctaLink ?? null;
}

export default function BannersPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    image: '',
    link: '',
    sortOrder: '1',
    isActive: true,
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', subtitle: '', image: '', link: '', sortOrder: '1', isActive: true });
    setModalOpen(true);
  };

  const openEdit = (b: Banner & { ctaLink?: string | null }) => {
    setEditing(b);
    setForm({
      title: b.title,
      subtitle: b.subtitle ?? '',
      image: b.image ?? '',
      link: bannerLink(b) ?? '',
      sortOrder: String(b.sortOrder),
      isActive: b.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      setSaving(true);
      const sortOrder = Number(form.sortOrder) || 0;
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        image: form.image.trim() || undefined,
        ctaLink: form.link.trim() || undefined,
        sortOrder,
      };
      if (editing) {
        body.isActive = form.isActive;
        await apiUpdate('banners', editing.id, body);
        toast.success('Banner updated');
      } else {
        await apiCreate('banners', body);
        toast.success('Banner created');
      }
      setModalOpen(false);
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      setDeleting(true);
      await apiDelete('banners', editing.id);
      toast.success('Banner deleted');
      setDeleteOpen(false);
      setEditing(null);
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Banner & { ctaLink?: string | null }>[] = [
    { key: 'title', header: 'Title', render: (r) => <span className="font-medium">{r.title}</span> },
    { key: 'subtitle', header: 'Subtitle', render: (r) => r.subtitle ?? '—' },
    {
      key: 'image',
      header: 'Image',
      render: (r) => {
        const src = r.image;
        if (!src) return '—';
        return <span className="max-w-[180px] truncate block text-text-muted" title={src}>{src}</span>;
      },
    },
    {
      key: 'link',
      header: 'Link',
      render: (r) => {
        const href = bannerLink(r);
        if (!href) return '—';
        return <span className="max-w-[160px] truncate block text-text-muted" title={href}>{href}</span>;
      },
    },
    { key: 'isActive', header: 'Status', render: (r) => <Badge variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
    { key: 'sortOrder', header: 'Order' },
    {
      key: 'startDate',
      header: 'Start',
      render: (r) => (r.startDate ? new Date(r.startDate).toLocaleString() : '—'),
    },
    {
      key: 'endDate',
      header: 'End',
      render: (r) => (r.endDate ? new Date(r.endDate).toLocaleString() : '—'),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (r) => new Date(r.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <>
      <AdminListPage<Banner & { ctaLink?: string | null }>
        title="Banners"
        section="banners"
        columns={columns}
        keyExtractor={(r) => r.id}
        searchKeys={['title']}
        refreshTrigger={refreshTrigger}
        onAdd={openAdd}
        addLabel="Add Banner"
        renderActions={(r) => (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"><Pencil size={15} /></button>
            <button type="button" onClick={() => { setEditing(r); setDeleteOpen(true); }} className="p-1.5 rounded-lg hover:bg-danger-50 text-text-muted hover:text-danger-600"><Trash2 size={15} /></button>
          </div>
        )}
      />
      <ActionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Banner' : 'Add Banner'}
        onSubmit={handleSave}
        loading={saving}
      >
        <FormField label="Title"><FormInput value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></FormField>
        <FormField label="Subtitle"><FormInput value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} /></FormField>
        <FormField label="Image URL"><FormInput value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} placeholder="/images/banners/..." /></FormField>
        <FormField label="Link"><FormInput value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} placeholder="https://..." /></FormField>
        <FormField label="Sort Order"><FormInput type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} /></FormField>
        {editing && (
          <FormField label="Active">
            <FormSelect value={form.isActive ? 'true' : 'false'} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'true' }))}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </FormSelect>
          </FormField>
        )}
      </ActionModal>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Banner"
        message={`Delete "${editing?.title}"?`}
      />
    </>
  );
}
