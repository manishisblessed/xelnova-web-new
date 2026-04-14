'use client';

import { useState } from 'react';
import { Badge, Button } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormSelect, FormToggle, FormTextarea } from '@/components/dashboard/form-field';
import { Pencil, Trash2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';
import { apiDelete, apiUpdate, apiPost } from '@/lib/api';

const STATUS_OPTIONS = ['ACTIVE', 'PENDING', 'DRAFT', 'REJECTED', 'ON_HOLD'] as const;

type ProductStatus = (typeof STATUS_OPTIONS)[number];

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  status: ProductStatus;
  isFeatured: boolean;
  isTrending: boolean;
  isFlashDeal: boolean;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  rejectionReason?: string | null;
  images?: string[];
  category: { name: string } | null;
  seller: { storeName: string } | null;
}

function statusBadgeVariant(status: ProductStatus): 'success' | 'warning' | 'danger' | 'default' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'DRAFT':
      return 'default';
    case 'REJECTED':
      return 'danger';
    case 'ON_HOLD':
      return 'warning';
    default:
      return 'default';
  }
}

function StatusIcon({ status }: { status: ProductStatus }) {
  switch (status) {
    case 'ACTIVE':
      return <CheckCircle size={14} className="text-success-500" />;
    case 'PENDING':
      return <Clock size={14} className="text-warning-500" />;
    case 'REJECTED':
      return <XCircle size={14} className="text-danger-500" />;
    case 'ON_HOLD':
      return <AlertTriangle size={14} className="text-warning-500" />;
    default:
      return null;
  }
}

export default function ProductsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [form, setForm] = useState({
    status: 'ACTIVE' as ProductStatus,
    isFeatured: false,
    isTrending: false,
    isFlashDeal: false,
    rejectionReason: '',
  });

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      status: p.status,
      isFeatured: p.isFeatured,
      isTrending: p.isTrending,
      isFlashDeal: p.isFlashDeal,
      rejectionReason: p.rejectionReason || '',
    });
    setModalOpen(true);
  };

  const handleApprove = async (product: Product) => {
    setApproving(product.id);
    try {
      await apiPost(`products/${product.id}/approve`, {});
      toast.success(`"${product.name}" approved and now live`);
      setRefreshTrigger((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve product');
    } finally {
      setApproving(null);
    }
  };

  const openReject = (p: Product) => {
    setEditing(p);
    setRejectionReason('');
    setRejectOpen(true);
  };

  const handleReject = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await apiPost(`products/${editing.id}/reject`, { rejectionReason });
      toast.success(`"${editing.name}" rejected`);
      setRejectOpen(false);
      setRefreshTrigger((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject product');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await apiUpdate('products', editing.id, {
        status: form.status,
        isFeatured: form.isFeatured,
        isTrending: form.isTrending,
        isFlashDeal: form.isFlashDeal,
        rejectionReason: form.status === 'REJECTED' ? form.rejectionReason : null,
      });
      toast.success('Product updated');
      setModalOpen(false);
      setRefreshTrigger((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    setDeleting(true);
    try {
      await apiDelete('products', editing.id);
      toast.success('Product deleted');
      setDeleteOpen(false);
      setRefreshTrigger((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-surface-muted overflow-hidden shrink-0 border border-border">
            {r.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.images[0]} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-text-muted">
                <Clock size={14} />
              </div>
            )}
          </div>
          <div>
            <span className="font-medium">{r.name}</span>
            <p className="text-xs text-text-muted mt-0.5">{r.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (r) => r.category?.name ?? '—',
    },
    {
      key: 'seller',
      header: 'Seller',
      render: (r) => r.seller?.storeName ?? '—',
    },
    {
      key: 'price',
      header: 'Price',
      render: (r) => (
        <span>
          ₹{r.price.toLocaleString()}
          {r.compareAtPrice != null && r.compareAtPrice > r.price && (
            <span className="ml-1.5 text-xs text-text-muted line-through">₹{r.compareAtPrice.toLocaleString()}</span>
          )}
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (r) => (
        <span className={r.stock < 10 ? 'text-danger-500 font-medium' : ''}>{r.stock}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <StatusIcon status={r.status} />
            <Badge variant={statusBadgeVariant(r.status)}>
              {r.status.charAt(0) + r.status.slice(1).toLowerCase().replace('_', ' ')}
            </Badge>
          </div>
          {r.status === 'REJECTED' && r.rejectionReason && (
            <p className="text-xs text-danger-600 max-w-[200px] truncate" title={r.rejectionReason}>
              {r.rejectionReason}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'isFeatured',
      header: 'Flags',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.isFeatured && <Badge variant="info">Featured</Badge>}
          {r.isTrending && <Badge variant="warning">Trending</Badge>}
          {r.isFlashDeal && <Badge variant="danger">Flash</Badge>}
          {!r.isFeatured && !r.isTrending && !r.isFlashDeal && (
            <span className="text-text-muted text-xs">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (r) => (
        <span>
          {r.rating} ★ <span className="text-text-muted text-xs">({r.reviewCount})</span>
        </span>
      ),
    },
  ];

  return (
    <>
      <AdminListPage<Product>
        title="Products"
        section="products"
        columns={columns}
        keyExtractor={(r) => r.id}
        searchKeys={['name', 'slug']}
        filterKey="status"
        filterOptions={[...STATUS_OPTIONS]}
        refreshTrigger={refreshTrigger}
        renderActions={(r) => (
          <div className="flex items-center gap-1">
            {r.status === 'PENDING' && (
              <>
                <button
                  type="button"
                  onClick={() => handleApprove(r)}
                  disabled={approving === r.id}
                  className="p-1.5 rounded-lg hover:bg-success-50 text-success-600 hover:text-success-700 disabled:opacity-50"
                  title="Approve"
                >
                  <CheckCircle size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => openReject(r)}
                  className="p-1.5 rounded-lg hover:bg-danger-50 text-danger-600 hover:text-danger-700"
                  title="Reject"
                >
                  <XCircle size={16} />
                </button>
              </>
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
        )}
      />
      <ActionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit Product"
        onSubmit={handleSave}
        loading={saving}
        wide
      >
        <p className="text-sm text-text-secondary -mt-1">
          Update listing status and visibility flags. Product details are managed by the seller.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Status">
            <FormSelect
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as ProductStatus }))
              }
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </FormSelect>
          </FormField>
        </div>
        {form.status === 'REJECTED' && (
          <FormField label="Rejection Reason">
            <FormTextarea
              value={form.rejectionReason}
              onChange={(e) => setForm((f) => ({ ...f, rejectionReason: e.target.value }))}
              placeholder="Explain why this product was rejected..."
              rows={3}
            />
          </FormField>
        )}
        <div className="space-y-3 pt-1">
          <FormToggle
            label="Featured"
            checked={form.isFeatured}
            onChange={(v) => setForm((f) => ({ ...f, isFeatured: v }))}
          />
          <FormToggle
            label="Trending"
            checked={form.isTrending}
            onChange={(v) => setForm((f) => ({ ...f, isTrending: v }))}
          />
          <FormToggle
            label="Flash deal"
            checked={form.isFlashDeal}
            onChange={(v) => setForm((f) => ({ ...f, isFlashDeal: v }))}
          />
        </div>
      </ActionModal>
      <ActionModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject Product"
        onSubmit={handleReject}
        loading={saving}
        submitLabel="Reject Product"
        submitVariant="danger"
      >
        <p className="text-sm text-text-secondary">
          Rejecting <strong>{editing?.name}</strong>. The seller will be notified and can make changes before resubmitting.
        </p>
        <FormField label="Rejection Reason">
          <FormTextarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explain why this product is being rejected (e.g., missing images, incorrect pricing, prohibited item)..."
            rows={4}
          />
        </FormField>
      </ActionModal>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Product"
        message={`Delete "${editing?.name}"? This cannot be undone.`}
      />
    </>
  );
}
