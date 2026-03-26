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
import { apiCreate, apiUpdate, apiDelete } from '@/lib/api';

interface CmsPage {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_OPTIONS = ['draft', 'published'] as const;

function statusLabel(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function CmsPagesPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<CmsPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ title: '', slug: '', status: 'draft' as string, content: '' });

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', slug: '', status: 'draft', content: '' });
    setModalOpen(true);
  };

  const openEdit = (p: CmsPage) => {
    setEditing(p);
    setForm({
      title: p.title,
      slug: p.slug,
      status: p.status,
      content: p.content ?? '',
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
      if (editing) {
        await apiUpdate('pages', editing.id, {
          title: form.title.trim(),
          content: form.content,
          status: form.status,
        });
        toast.success('Page updated');
      } else {
        await apiCreate('pages', {
          title: form.title.trim(),
          content: form.content || undefined,
          status: form.status,
        });
        toast.success('Page created');
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
      await apiDelete('pages', editing.id);
      toast.success('Page deleted');
      setDeleteOpen(false);
      setEditing(null);
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<CmsPage>[] = [
    { key: 'title', header: 'Title', render: (r) => <span className="font-medium">{r.title}</span> },
    { key: 'slug', header: 'Slug', render: (r) => <span className="font-mono text-xs text-text-muted">/{r.slug}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge variant={r.status.toLowerCase() === 'published' ? 'success' : 'default'}>{statusLabel(r.status)}</Badge>
      ),
    },
    { key: 'updatedAt', header: 'Updated', render: (r) => new Date(r.updatedAt).toLocaleDateString() },
  ];

  return (
    <>
      <AdminListPage<CmsPage>
        title="CMS Pages"
        section="pages"
        columns={columns}
        keyExtractor={(r) => r.id}
        searchKeys={['title', 'slug']}
        filterKey="status"
        filterOptions={[...STATUS_OPTIONS]}
        refreshTrigger={refreshTrigger}
        onAdd={openAdd}
        addLabel="Create Page"
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
        title={editing ? 'Edit Page' : 'Create Page'}
        wide
        onSubmit={handleSave}
        loading={saving}
      >
        <FormField label="Title">
          <FormInput
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </FormField>
        {editing && (
          <FormField label="Slug (read-only)">
            <FormInput value={form.slug} readOnly className="opacity-80" />
          </FormField>
        )}
        <FormField label="Status">
          <FormSelect value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Content">
          <FormTextarea
            rows={8}
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Page content (HTML or markdown)"
          />
        </FormField>
      </ActionModal>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Page"
        message={`Delete "${editing?.title}"?`}
      />
    </>
  );
}
