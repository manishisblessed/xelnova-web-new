'use client';

import { useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormInput, FormSelect } from '@/components/dashboard/form-field';
import { Pencil, Trash2, Copy, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';
import { apiCreate, apiUpdate, apiDelete, apiApproveSellerCoupon, apiRejectSellerCoupon } from '@/lib/api';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  validUntil: string | null;
  usageLimit: number | null;
  maxRedemptionsPerUser?: number | null;
  usedCount: number;
  isActive: boolean;
  moderationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  sellerId?: string | null;
  sellerName?: string | null;
  rejectionReason?: string | null;
  scope?: string;
  createdAt: string;
}

export default function CouponsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    code: '',
    description: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FLAT',
    discountValue: '',
    minOrderAmount: '',
    maxDiscount: '',
    validUntil: '',
    usageLimit: '',
    isActive: true,
    scope: 'global' as 'global' | 'category' | 'seller',
    categoryId: '',
    sellerId: '',
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      code: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountValue: '',
      minOrderAmount: '',
      maxDiscount: '',
      validUntil: '',
      usageLimit: '',
      isActive: true,
      scope: 'global',
      categoryId: '',
      sellerId: '',
    });
    setModalOpen(true);
  };

  const toDatetimeLocal = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description ?? '',
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      minOrderAmount: String(c.minOrderAmount),
      maxDiscount: c.maxDiscount != null ? String(c.maxDiscount) : '',
      validUntil: toDatetimeLocal(c.validUntil),
      usageLimit: c.usageLimit != null ? String(c.usageLimit) : '',
      isActive: c.isActive,
      scope: (c as any).scope || 'global',
      categoryId: (c as any).categoryId || '',
      sellerId: (c as any).sellerId || '',
    });
    setModalOpen(true);
  };

  const copyCode = (code: string) => {
    void navigator.clipboard.writeText(code);
    toast.success(`Copied "${code}"`);
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast.error('Code is required');
      return;
    }
    const discountValue = Number(form.discountValue);
    if (Number.isNaN(discountValue)) {
      toast.error('Discount value must be a number');
      return;
    }
    try {
      setSaving(true);
      const body: Record<string, unknown> = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || undefined,
        discountType: form.discountType,
        discountValue,
        minOrderAmount: Number(form.minOrderAmount) || 0,
        maxDiscount: form.maxDiscount.trim() ? Number(form.maxDiscount) : undefined,
        validUntil: form.validUntil.trim() ? new Date(form.validUntil).toISOString() : undefined,
        usageLimit: form.usageLimit.trim() ? Number(form.usageLimit) : undefined,
        scope: form.scope,
        categoryId: form.scope === 'category' ? form.categoryId.trim() || undefined : undefined,
        sellerId: form.scope === 'seller' ? form.sellerId.trim() || undefined : undefined,
      };
      if (editing) {
        body.isActive = form.isActive;
        await apiUpdate('coupons', editing.id, body);
        toast.success('Coupon updated');
      } else {
        await apiCreate('coupons', body);
        toast.success('Coupon created');
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
      await apiDelete('coupons', editing.id);
      toast.success('Coupon deleted');
      setDeleteOpen(false);
      setEditing(null);
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Coupon>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-primary-600">{r.code}</span>
          <button type="button" onClick={() => copyCode(r.code)} className="p-0.5 rounded hover:bg-surface-muted"><Copy size={13} /></button>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (r) => {
        const d = r.description;
        if (!d) return '—';
        return <span className="max-w-[200px] truncate block" title={d}>{d}</span>;
      },
    },
    { key: 'discountType', header: 'Type', render: (r) => <Badge variant="info">{r.discountType === 'PERCENTAGE' ? 'Percent' : 'Flat'}</Badge> },
    {
      key: 'discountValue',
      header: 'Value',
      render: (r) => (r.discountType === 'PERCENTAGE' ? `${r.discountValue}%` : `₹${r.discountValue}`),
    },
    { key: 'minOrderAmount', header: 'Min order', render: (r) => `₹${Number(r.minOrderAmount).toLocaleString()}` },
    {
      key: 'maxDiscount',
      header: 'Max discount',
      render: (r) => (r.maxDiscount != null ? `₹${Number(r.maxDiscount).toLocaleString()}` : '—'),
    },
    {
      key: 'seller',
      header: 'Seller',
      render: (r) => (
        <span className="max-w-[140px] truncate block text-xs" title={r.sellerName || ''}>
          {r.sellerId ? r.sellerName || r.sellerId : '—'}
        </span>
      ),
    },
    {
      key: 'moderation',
      header: 'Moderation',
      render: (r) => {
        const st = r.moderationStatus ?? 'APPROVED';
        const variant = st === 'APPROVED' ? 'success' : st === 'PENDING' ? 'warning' : 'danger';
        return <Badge variant={variant}>{st}</Badge>;
      },
    },
    {
      key: 'usage',
      header: 'Used',
      render: (r) =>
        `${r.usedCount}${r.usageLimit != null ? ` / ${r.usageLimit}` : ''}${
          r.maxRedemptionsPerUser != null ? ` · max/user ${r.maxRedemptionsPerUser}` : ''
        }`,
    },
    { key: 'isActive', header: 'Status', render: (r) => <Badge variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
    {
      key: 'validUntil',
      header: 'Valid until',
      render: (r) => (r.validUntil ? new Date(r.validUntil).toLocaleString() : '—'),
    },
    { key: 'createdAt', header: 'Created', render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ];

  return (
    <>
      <AdminListPage<Coupon>
        title="Coupons"
        section="coupons"
        columns={columns}
        keyExtractor={(r) => r.id}
        searchKeys={['code', 'description']}
        refreshTrigger={refreshTrigger}
        onAdd={openAdd}
        addLabel="Create Coupon"
        renderActions={(r) => (
          <div className="flex items-center gap-1 justify-end flex-wrap">
            {r.moderationStatus === 'PENDING' && r.sellerId && (
              <>
                <button
                  type="button"
                  disabled={moderatingId === r.id}
                  title="Approve"
                  onClick={async () => {
                    setModeratingId(r.id);
                    try {
                      await apiApproveSellerCoupon(r.id);
                      toast.success('Coupon approved');
                      setRefreshTrigger((t) => t + 1);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Approve failed');
                    } finally {
                      setModeratingId(null);
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 disabled:opacity-50"
                >
                  <CheckCircle size={15} />
                </button>
                <button
                  type="button"
                  disabled={moderatingId === r.id}
                  title="Reject"
                  onClick={async () => {
                    const reason =
                      typeof window !== 'undefined'
                        ? window.prompt('Rejection reason for seller:', '') ?? ''
                        : '';
                    setModeratingId(r.id);
                    try {
                      await apiRejectSellerCoupon(r.id, reason.trim() || undefined);
                      toast.success('Coupon rejected');
                      setRefreshTrigger((t) => t + 1);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Reject failed');
                    } finally {
                      setModeratingId(null);
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-50"
                >
                  <XCircle size={15} />
                </button>
              </>
            )}
            <button type="button" onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"><Pencil size={15} /></button>
            <button type="button" onClick={() => { setEditing(r); setDeleteOpen(true); }} className="p-1.5 rounded-lg hover:bg-danger-50 text-text-muted hover:text-danger-600"><Trash2 size={15} /></button>
          </div>
        )}
      />
      <ActionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Coupon' : 'Create Coupon'}
        onSubmit={handleSave}
        loading={saving}
        wide
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Code"><FormInput value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE10" /></FormField>
          <FormField label="Discount type">
            <FormSelect value={form.discountType} onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as 'PERCENTAGE' | 'FLAT' }))}>
              <option value="PERCENTAGE">PERCENTAGE</option>
              <option value="FLAT">FLAT</option>
            </FormSelect>
          </FormField>
          <FormField label="Discount value"><FormInput type="number" step="any" value={form.discountValue} onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))} /></FormField>
          <FormField label="Min order (₹)"><FormInput type="number" step="any" value={form.minOrderAmount} onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value }))} /></FormField>
          <FormField label="Max discount (₹)"><FormInput type="number" step="any" value={form.maxDiscount} onChange={(e) => setForm((f) => ({ ...f, maxDiscount: e.target.value }))} placeholder="Optional" /></FormField>
          <FormField label="Usage limit"><FormInput type="number" value={form.usageLimit} onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))} placeholder="Optional" /></FormField>
          <div className="col-span-2">
            <FormField label="Valid until">
              <FormInput type="datetime-local" value={form.validUntil} onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))} />
            </FormField>
          </div>
          <div className="col-span-2">
            <FormField label="Description"><FormInput value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional" /></FormField>
          </div>
          <FormField label="Scope">
            <FormSelect value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as any }))}>
              <option value="global">Global (all products)</option>
              <option value="category">Category-specific</option>
              <option value="seller">Seller-specific</option>
            </FormSelect>
          </FormField>
          {form.scope === 'category' && (
            <FormField label="Category ID"><FormInput value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} placeholder="Category ID" /></FormField>
          )}
          {form.scope === 'seller' && (
            <FormField label="Seller ID"><FormInput value={form.sellerId} onChange={(e) => setForm((f) => ({ ...f, sellerId: e.target.value }))} placeholder="Seller Profile ID" /></FormField>
          )}
          {editing && (
            <div className="col-span-2">
              <FormField label="Active">
                <FormSelect value={form.isActive ? 'true' : 'false'} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'true' }))}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </FormSelect>
              </FormField>
            </div>
          )}
        </div>
      </ActionModal>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Coupon"
        message={`Delete coupon "${editing?.code}"?`}
      />
    </>
  );
}
