'use client';

import { useCallback, useMemo, useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormInput, FormTextarea, FormToggle } from '@/components/dashboard/form-field';
import { CheckCircle, ExternalLink, Pencil, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';
import { apiCreate, apiUpdate, apiDelete } from '@/lib/api';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  featured: boolean;
  approved?: boolean;
  isActive?: boolean;
  authorizationCertificate?: string | null;
  rejectionReason?: string | null;
  proposedBy?: string | null;
  proposer?: { id: string; storeName: string | null; sellerCode?: string | null; email?: string | null } | null;
  createdAt?: string;
}

type Filter = 'ALL' | 'PENDING' | 'APPROVED';

export default function BrandsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [rejectionReason, setRejectionReason] = useState('');
  const [form, setForm] = useState({
    name: '',
    logo: '',
    featured: false,
    authorizationCertificate: '',
  });

  const queryParams = useMemo(() => undefined, []);

  // Pending brands and recent additions float to the top of the list so they
  // are noticed immediately. Filtering is applied client-side because the
  // backend already returns the full list sorted by approval status.
  const normalizeBrands = useCallback(
    (rows: Brand[]) => {
      const sorted = [...rows].sort((a, b) => {
        const aPending = a.approved === false ? 0 : 1;
        const bPending = b.approved === false ? 0 : 1;
        if (aPending !== bPending) return aPending - bPending;
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
      if (filter === 'PENDING') return sorted.filter((r) => r.approved === false);
      if (filter === 'APPROVED') return sorted.filter((r) => r.approved !== false);
      return sorted;
    },
    [filter],
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', logo: '', featured: false, authorizationCertificate: '' });
    setModalOpen(true);
  };

  const openEdit = (b: Brand) => {
    setEditing(b);
    setForm({
      name: b.name,
      logo: b.logo ?? '',
      featured: b.featured,
      authorizationCertificate: b.authorizationCertificate ?? '',
    });
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
      const cert = form.authorizationCertificate.trim();
      if (editing) {
        await apiUpdate('brands', editing.id, {
          name,
          logo: logo || '',
          featured: form.featured,
          authorizationCertificate: cert || '',
        });
        toast.success('Brand updated');
      } else {
        await apiCreate('brands', {
          name,
          ...(logo ? { logo } : {}),
          featured: form.featured,
          ...(cert ? { authorizationCertificate: cert } : {}),
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

  const approve = async (b: Brand) => {
    try {
      await apiUpdate('brands', b.id, { approved: true });
      toast.success(`"${b.name}" approved`);
      setRefreshTrigger((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approve failed');
    }
  };

  const openReject = (b: Brand) => {
    setEditing(b);
    setRejectionReason(b.rejectionReason ?? '');
    setRejectOpen(true);
  };

  const handleReject = async () => {
    if (!editing) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      toast.error('Add a short reason so the seller knows what to fix');
      return;
    }
    setSaving(true);
    try {
      await apiUpdate('brands', editing.id, { approved: false, rejectionReason: reason });
      toast.success('Brand rejected');
      setRefreshTrigger((n) => n + 1);
      setRejectOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reject failed');
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
    {
      key: 'name',
      header: 'Brand',
      render: (r) => (
        <div className="flex items-center gap-2 min-w-0">
          {r.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.logo} alt="" className="h-8 w-8 rounded border border-border object-contain bg-white" />
          ) : (
            <div className="h-8 w-8 rounded border border-border bg-surface-muted" />
          )}
          <div className="min-w-0">
            <p className="font-medium text-text-primary truncate">{r.name}</p>
            <p className="text-[11px] text-text-muted font-mono truncate">{r.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'approved',
      header: 'Status',
      render: (r) => {
        const approved = r.approved !== false; // legacy rows default to approved
        return (
          <Badge variant={approved ? 'success' : 'warning'}>
            {approved ? 'Approved' : 'Pending review'}
          </Badge>
        );
      },
    },
    {
      key: 'proposer',
      header: 'Proposed by',
      render: (r) => {
        if (!r.proposer && !r.proposedBy) {
          return <span className="text-text-muted text-xs">Admin</span>;
        }
        return (
          <div className="text-xs min-w-0 max-w-[180px]">
            <p className="font-medium text-text-primary truncate">
              {r.proposer?.storeName ?? '—'}
            </p>
            {r.proposer?.email && (
              <p className="text-text-muted truncate" title={r.proposer.email}>
                {r.proposer.email}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'authorizationCertificate',
      header: 'Authorisation cert.',
      render: (r) =>
        r.authorizationCertificate ? (
          <a
            href={r.authorizationCertificate}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 underline"
          >
            <ExternalLink size={12} /> Open
          </a>
        ) : (
          <span className="text-text-muted text-xs">—</span>
        ),
    },
    {
      key: 'featured',
      header: 'Featured',
      render: (r) => (
        <Badge variant={r.featured ? 'success' : 'default'}>{r.featured ? 'Yes' : 'No'}</Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Added',
      render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'),
    },
  ];

  return (
    <>
      <div className="mx-6 mt-6 mb-0 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-text-muted uppercase tracking-wide">Show:</span>
        {(['ALL', 'PENDING', 'APPROVED'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFilter(f);
              setRefreshTrigger((n) => n + 1);
            }}
            className={`rounded-full border px-3 py-1 transition-colors ${
              filter === f
                ? 'border-primary-500 bg-primary-500 text-white'
                : 'border-border bg-surface text-text-secondary hover:border-primary-300 hover:text-primary-600'
            }`}
          >
            {f === 'ALL' ? 'All brands' : f === 'PENDING' ? 'Pending review' : 'Approved'}
          </button>
        ))}
      </div>

      <AdminListPage<Brand>
        title="Brands"
        section="brands"
        columns={columns}
        keyExtractor={(r) => r.id}
        searchKeys={['name', 'slug']}
        onAdd={openAdd}
        addLabel="Add Brand"
        refreshTrigger={refreshTrigger}
        queryParams={queryParams}
        normalizeItems={normalizeBrands}
        renderActions={(r) => {
          const approved = r.approved !== false;
          return (
            <div className="flex items-center gap-1">
              {!approved && (
                <button
                  type="button"
                  onClick={() => void approve(r)}
                  className="p-1.5 rounded-lg hover:bg-success-50 text-success-600"
                  title="Approve brand"
                >
                  <CheckCircle size={15} />
                </button>
              )}
              {!approved && (
                <button
                  type="button"
                  onClick={() => openReject(r)}
                  className="p-1.5 rounded-lg hover:bg-danger-50 text-danger-600"
                  title="Reject brand"
                >
                  <XCircle size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={() => openEdit(r)}
                className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"
                title="Edit"
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
                title="Delete"
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        }}
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
        <FormField
          label="Authorisation certificate URL"
          hint="Link to the seller-uploaded brand authorisation document. Required when a seller wants to add more than one brand."
        >
          <FormInput
            value={form.authorizationCertificate}
            onChange={(e) => setForm((f) => ({ ...f, authorizationCertificate: e.target.value }))}
            placeholder="https://..."
          />
        </FormField>
        <FormToggle label="Featured" checked={form.featured} onChange={(v) => setForm((f) => ({ ...f, featured: v }))} />
      </ActionModal>
      <ActionModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject brand proposal"
        onSubmit={handleReject}
        loading={saving}
        submitLabel="Reject"
        submitVariant="danger"
      >
        <p className="text-sm text-text-secondary">
          Rejecting <strong>{editing?.name}</strong>. The seller will see this note and can
          re-submit with a valid authorisation certificate.
        </p>
        <FormField label="Reason for rejection">
          <FormTextarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g., Authorisation certificate missing or doesn't match the seller's GST."
            rows={4}
          />
        </FormField>
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
