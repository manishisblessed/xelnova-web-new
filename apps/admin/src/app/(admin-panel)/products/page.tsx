'use client';

import { useState, useEffect } from 'react';
import { Badge, Button } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormSelect, FormToggle, FormTextarea } from '@/components/dashboard/form-field';
import { Pencil, Trash2, CheckCircle, XCircle, Clock, AlertTriangle, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';
import { apiDelete, apiUpdate, apiPost, apiGetAdminProduct } from '@/lib/api';

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

/** Full product from GET /admin/products/:id (extends list row with seller copy fields). */
type AdminProductDetail = Product & {
  shortDescription?: string | null;
  description?: string | null;
  productDescription?: string | null;
  safetyInfo?: string | null;
  regulatoryInfo?: string | null;
  warrantyInfo?: string | null;
  highlights?: string[];
  tags?: string[];
  weight?: number | null;
  dimensions?: string | null;
  sku?: string | null;
  brand?: string | null;
  variants?: unknown;
  featuresAndSpecs?: unknown;
  materialsAndCare?: unknown;
  itemDetails?: unknown;
  additionalDetails?: unknown;
  metaTitle?: string | null;
  metaDescription?: string | null;
  hsnCode?: string | null;
  gstRate?: number | null;
  lowStockThreshold?: number | null;
  deliveredBy?: string | null;
  category?: { id: string; name: string } | null;
  seller?: { storeName: string; email?: string | null; phone?: string | null } | null;
};

function SpecSection({ label, value }: { label: string; value: unknown }) {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  const entries = Object.entries(o).filter(([, v]) => v != null && String(v).trim() !== '');
  if (entries.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-surface-muted/30 p-3">
      <p className="text-xs font-semibold text-text-primary mb-2">{label}</p>
      <dl className="space-y-1.5 text-sm">
        {entries.map(([k, v]) => (
          <div key={k} className="grid grid-cols-1 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-x-3 gap-y-0.5">
            <dt className="text-text-muted text-xs shrink-0">{k}</dt>
            <dd className="text-text-primary break-words">{String(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
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
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<AdminProductDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewImageIdx, setViewImageIdx] = useState(0);
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

  useEffect(() => {
    if (viewing?.id) setViewImageIdx(0);
  }, [viewing?.id]);

  const openView = async (p: Product) => {
    setViewOpen(true);
    setViewLoading(true);
    setViewing(null);
    try {
      const detail = await apiGetAdminProduct<AdminProductDetail>(p.id);
      setViewing(detail);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load product');
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const handleApprove = async (product: Product, options?: { closeView?: boolean }) => {
    setApproving(product.id);
    try {
      await apiPost(`products/${product.id}/approve`, {});
      toast.success(`"${product.name}" approved and now live`);
      setRefreshTrigger((n) => n + 1);
      if (options?.closeView) {
        setViewOpen(false);
        setViewing(null);
      }
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
      className: 'min-w-[280px] max-w-[320px]',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-surface-muted overflow-hidden shrink-0 border border-border">
            {r.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.images[0]} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-text-muted">
                <Clock size={16} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-text-primary line-clamp-2 leading-tight" title={r.name}>
              {r.name}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      className: 'whitespace-nowrap',
      render: (r) => (
        <span className="text-text-secondary">{r.category?.name ?? '—'}</span>
      ),
    },
    {
      key: 'seller',
      header: 'Seller',
      className: 'whitespace-nowrap',
      render: (r) => (
        <span className="text-text-secondary">{r.seller?.storeName ?? '—'}</span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      className: 'whitespace-nowrap text-right',
      render: (r) => (
        <div className="text-right">
          <span className="font-medium">₹{r.price.toLocaleString()}</span>
          {r.compareAtPrice != null && r.compareAtPrice > r.price && (
            <span className="ml-1 text-xs text-text-muted line-through">₹{r.compareAtPrice.toLocaleString()}</span>
          )}
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      className: 'whitespace-nowrap text-center w-[70px]',
      render: (r) => (
        <span className={`font-medium ${r.stock < 10 ? 'text-danger-500' : 'text-text-primary'}`}>
          {r.stock}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'whitespace-nowrap',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <StatusIcon status={r.status} />
          <Badge variant={statusBadgeVariant(r.status)}>
            {r.status.charAt(0) + r.status.slice(1).toLowerCase().replace('_', ' ')}
          </Badge>
        </div>
      ),
    },
    {
      key: 'isFeatured',
      header: 'Flags',
      className: 'whitespace-nowrap',
      render: (r) => (
        <div className="flex items-center gap-1">
          {r.isFeatured && <Badge variant="info">Featured</Badge>}
          {r.isTrending && <Badge variant="warning">Trending</Badge>}
          {r.isFlashDeal && <Badge variant="danger">Flash</Badge>}
          {!r.isFeatured && !r.isTrending && !r.isFlashDeal && (
            <span className="text-text-muted">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      className: 'whitespace-nowrap w-[90px]',
      render: (r) => (
        <div className="flex items-center gap-1">
          <span className="font-medium text-amber-500">{r.rating.toFixed(1)}</span>
          <span className="text-amber-500">★</span>
          <span className="text-text-muted text-xs">({r.reviewCount})</span>
        </div>
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
        actionsClassName="min-w-[148px] text-right"
        renderActions={(r) => (
          <div className="flex items-center justify-end gap-0.5 flex-wrap">
            <button
              type="button"
              onClick={() => openView(r)}
              className="p-1.5 rounded-md hover:bg-primary-50 text-text-muted hover:text-primary-600 transition-colors"
              title="View details & images"
            >
              <Eye size={16} />
            </button>
            {r.status === 'PENDING' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    toast.info('Review product images before approval');
                    void openView(r);
                  }}
                  className="p-1.5 rounded-md hover:bg-success-50 text-success-600 hover:text-success-700 disabled:opacity-50 transition-colors"
                  title="Review before approve"
                >
                  <CheckCircle size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => openReject(r)}
                  className="p-1.5 rounded-md hover:bg-danger-50 text-danger-600 hover:text-danger-700 transition-colors"
                  title="Reject"
                >
                  <XCircle size={16} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => openEdit(r)}
              className="p-1.5 rounded-md hover:bg-primary-50 text-text-muted hover:text-primary-600 transition-colors"
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
              className="p-1.5 rounded-md hover:bg-danger-50 text-text-muted hover:text-danger-600 transition-colors"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      />
      <ActionModal
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setViewing(null);
        }}
        title={viewing?.name ?? 'Product preview'}
        extraWide
      >
        {viewLoading && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <p className="text-sm">Loading product…</p>
          </div>
        )}
        {!viewLoading && viewing && (
          <div className="space-y-5 -mt-1">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
              <span>
                <span className="text-text-secondary">Seller:</span> {viewing.seller?.storeName ?? '—'}
              </span>
              <span>
                <span className="text-text-secondary">Category:</span> {viewing.category?.name ?? '—'}
              </span>
              <span>
                <span className="text-text-secondary">Price:</span>{' '}
                <span className="font-medium text-text-primary">₹{viewing.price.toLocaleString()}</span>
                {viewing.compareAtPrice != null && viewing.compareAtPrice > viewing.price && (
                  <span className="line-through ml-1">₹{viewing.compareAtPrice.toLocaleString()}</span>
                )}
              </span>
              <span>
                <span className="text-text-secondary">Stock:</span>{' '}
                <span className="font-medium text-text-primary">{viewing.stock}</span>
              </span>
            </div>
            {(viewing.seller?.email || viewing.seller?.phone) && (
              <p className="text-xs text-text-muted">
                {viewing.seller?.email && <span className="mr-3">Seller email: {viewing.seller.email}</span>}
                {viewing.seller?.phone && <span>Seller phone: {viewing.seller.phone}</span>}
              </p>
            )}

            {viewing.images && viewing.images.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-text-primary">Images ({viewing.images.length})</p>
                <div className="rounded-xl border border-border bg-surface-muted/20 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={viewing.images[viewImageIdx]}
                    alt=""
                    className="w-full max-h-[min(360px,50vh)] object-contain bg-black/5"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {viewing.images.map((url, i) => (
                    <button
                      key={`${url}-${i}`}
                      type="button"
                      onClick={() => setViewImageIdx(i)}
                      className={`h-16 w-16 rounded-lg border-2 overflow-hidden shrink-0 transition-colors ${
                        i === viewImageIdx ? 'border-primary-500 ring-2 ring-primary-200' : 'border-border hover:border-primary-300'
                      }`}
                      title={`Image ${i + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-warning-600 bg-warning-50 border border-warning-200 rounded-lg px-3 py-2">
                No images uploaded for this product.
              </p>
            )}

            {viewing.shortDescription?.trim() && (
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">Short description</p>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{viewing.shortDescription}</p>
              </div>
            )}

            {viewing.description?.trim() && (
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">Description</p>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{viewing.description}</p>
              </div>
            )}

            {viewing.productDescription?.trim() && (
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">Product description</p>
                <div className="text-sm text-text-secondary whitespace-pre-wrap max-h-48 overflow-y-auto rounded-lg border border-border bg-surface-muted/20 p-3">
                  {viewing.productDescription}
                </div>
              </div>
            )}

            <SpecSection label="Features & specs" value={viewing.featuresAndSpecs} />
            <SpecSection label="Materials & care" value={viewing.materialsAndCare} />
            <SpecSection label="Item details" value={viewing.itemDetails} />
            <SpecSection label="Additional details" value={viewing.additionalDetails} />

            {viewing.highlights && viewing.highlights.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">Highlights</p>
                <ul className="list-disc list-inside text-sm text-text-secondary space-y-0.5">
                  {viewing.highlights.map((h, i) => (
                    <li key={`${i}-${h}`}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {(viewing.warrantyInfo?.trim() ||
              viewing.safetyInfo?.trim() ||
              viewing.regulatoryInfo?.trim()) && (
              <div className="space-y-2 text-sm">
                {viewing.warrantyInfo?.trim() && (
                  <div>
                    <p className="text-xs font-semibold text-text-primary mb-0.5">Warranty</p>
                    <p className="text-text-secondary whitespace-pre-wrap">{viewing.warrantyInfo}</p>
                  </div>
                )}
                {viewing.safetyInfo?.trim() && (
                  <div>
                    <p className="text-xs font-semibold text-text-primary mb-0.5">Safety & resources</p>
                    <p className="text-text-secondary whitespace-pre-wrap">{viewing.safetyInfo}</p>
                  </div>
                )}
                {viewing.regulatoryInfo?.trim() && (
                  <div>
                    <p className="text-xs font-semibold text-text-primary mb-0.5">Regulatory</p>
                    <p className="text-text-secondary whitespace-pre-wrap">{viewing.regulatoryInfo}</p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-text-secondary">
              {viewing.sku?.trim() && (
                <p>
                  <span className="text-text-muted">SKU:</span> {viewing.sku}
                </p>
              )}
              {viewing.brand?.trim() && (
                <p>
                  <span className="text-text-muted">Brand:</span> {viewing.brand}
                </p>
              )}
              {viewing.weight != null && (
                <p>
                  <span className="text-text-muted">Weight (kg):</span> {viewing.weight}
                </p>
              )}
              {viewing.dimensions?.trim() && (
                <p>
                  <span className="text-text-muted">Dimensions (cm):</span> {viewing.dimensions}
                </p>
              )}
              {viewing.hsnCode?.trim() && (
                <p>
                  <span className="text-text-muted">HSN:</span> {viewing.hsnCode}
                </p>
              )}
            </div>

            {viewing.variants != null && (
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">Variants (JSON)</p>
                <pre className="text-[11px] leading-relaxed bg-surface-muted/40 border border-border rounded-lg p-3 max-h-52 overflow-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(viewing.variants, null, 2)}
                </pre>
              </div>
            )}

            {viewing.status === 'PENDING' && (
              <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const p = viewing;
                    setViewOpen(false);
                    setViewing(null);
                    openReject(p);
                  }}
                >
                  Reject…
                </Button>
                <Button
                  type="button"
                  size="sm"
                  loading={approving === viewing.id}
                  onClick={() => handleApprove(viewing, { closeView: true })}
                >
                  Approve & publish
                </Button>
              </div>
            )}
          </div>
        )}
      </ActionModal>

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
