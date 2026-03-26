'use client';

import { useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormSelect, FormToggle } from '@/components/dashboard/form-field';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';
import { apiDelete, apiUpdate } from '@/lib/api';

const STATUS_OPTIONS = ['ACTIVE', 'PENDING', 'DRAFT', 'REJECTED'] as const;

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
  rating: number;
  reviewCount: number;
  createdAt: string;
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
    default:
      return 'default';
  }
}

export default function ProductsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    status: 'ACTIVE' as ProductStatus,
    isFeatured: false,
    isTrending: false,
    isFlashDeal: false,
  });

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      status: p.status,
      isFeatured: p.isFeatured,
      isTrending: p.isTrending,
      isFlashDeal: p.isFlashDeal,
    });
    setModalOpen(true);
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
        <div>
          <span className="font-medium">{r.name}</span>
          <p className="text-xs text-text-muted mt-0.5">{r.slug}</p>
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
        <Badge variant={statusBadgeVariant(r.status)}>
          {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
        </Badge>
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
