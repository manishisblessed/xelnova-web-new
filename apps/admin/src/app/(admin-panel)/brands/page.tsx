'use client';

import { useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormInput, FormToggle } from '@/components/dashboard/form-field';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';
import { apiCreate, apiUpdate, apiDelete } from '@/lib/api';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  featured: boolean;
}

export default function BrandsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState({ name: '', logo: '', featured: false });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', logo: '', featured: false });
    setModalOpen(true);
  };

  const openEdit = (b: Brand) => {
    setEditing(b);
    setForm({ name: b.name, logo: b.logo ?? '', featured: b.featured });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const logo = form.logo.trim();
      if (editing) {
        await apiUpdate('brands', editing.id, {
          name,
          ...(logo ? { logo } : { logo: '' }),
          featured: form.featured,
        });
        toast.success('Brand updated');
      } else {
        await apiCreate('brands', {
          name,
          ...(logo ? { logo } : {}),
          featured: form.featured,
        });
        toast.success('Brand created');
      }
      setRefreshTrigger((n) => n + 1);
      setModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    setDeleting(true);
    try {
      await apiDelete('brands', editing.id);
      toast.success('Brand deleted');
      setRefreshTrigger((n) => n + 1);
      setDeleteOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Brand>[] = [
    { key: 'name', header: 'Brand', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'slug', header: 'Slug', render: (r) => <span className="font-mono text-xs text-text-muted">{r.slug}</span> },
    {
      key: 'logo',
      header: 'Logo',
      render: (r) =>
        r.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.logo} alt="" className="h-8 w-auto max-w-[120px] object-contain rounded" />
        ) : (
          <span className="text-text-muted text-sm">—</span>
        ),
    },
    {
      key: 'featured',
      header: 'Featured',
      render: (r) => <Badge variant={r.featured ? 'success' : 'default'}>{r.featured ? 'Featured' : 'Standard'}</Badge>,
    },
  ];

  return (
    <>
      <AdminListPage<Brand>
        title="Brands"
        section="brands"
        columns={columns}
        keyExtractor={(r) => r.id}
        searchKeys={['name']}
        onAdd={openAdd}
        addLabel="Add Brand"
        refreshTrigger={refreshTrigger}
        renderActions={(r) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => openEdit(r)}
              className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(r);
                setDeleteOpen(true);
              }}
              className="p-1.5 rounded-lg hover:bg-danger-50 text-text-muted hover:text-danger-600"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      />
      <ActionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Brand' : 'Add Brand'}
        onSubmit={handleSave}
        loading={saving}
      >
        <FormField label="Name">
          <FormInput
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </FormField>
        {editing && (
          <FormField label="Slug">
            <FormInput value={editing.slug} readOnly className="bg-surface-muted" />
          </FormField>
        )}
        <FormField label="Logo URL">
          <FormInput
            value={form.logo}
            onChange={(e) => setForm((f) => ({ ...f, logo: e.target.value }))}
            placeholder="https://..."
          />
        </FormField>
        <FormToggle label="Featured" checked={form.featured} onChange={(v) => setForm((f) => ({ ...f, featured: v }))} />
      </ActionModal>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Brand"
        message={`Delete "${editing?.name}"?`}
        loading={deleting}
      />
    </>
  );
}
