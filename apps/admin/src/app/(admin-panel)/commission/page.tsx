'use client';

import { useState, useCallback } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormInput, FormSelect } from '@/components/dashboard/form-field';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';
import { apiCreate, apiUpdate, apiDelete } from '@/lib/api';

/** API may return `categoryId` + `type` + `minAmount` or legacy `categorySlug` + `isPercentage` + `minOrder`. */
interface CommissionRule {
  id: string;
  categoryId: string;
  rate: number;
  type: 'PERCENTAGE' | 'FLAT';
  minAmount: number;
  isActive: boolean;
  createdAt: string;
}

type ApiCommissionRow = {
  id: string;
  categoryId?: string;
  categorySlug?: string;
  rate: number;
  type?: string;
  isPercentage?: boolean;
  minAmount?: number;
  minOrder?: number;
  isActive: boolean;
  createdAt: string;
};

function fromApiRow(r: ApiCommissionRow): CommissionRule {
  const isPct =
    r.type === 'PERCENTAGE' ||
    r.type === 'percentage' ||
    r.isPercentage === true;
  const min = r.minAmount ?? r.minOrder ?? 0;
  const cat = (r.categoryId ?? r.categorySlug ?? '').trim();
  return {
    id: r.id,
    categoryId: cat,
    rate: r.rate,
    type: isPct ? 'PERCENTAGE' : 'FLAT',
    minAmount: min,
    isActive: r.isActive,
    createdAt: r.createdAt,
  };
}

export default function CommissionPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<CommissionRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    categoryId: '',
    rate: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FLAT',
    minAmount: '',
    isActive: 'true',
  });

  const normalizeItems = useCallback(
    (rows: CommissionRule[]) => (rows as unknown as ApiCommissionRow[]).map(fromApiRow),
    [],
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ categoryId: '', rate: '', type: 'PERCENTAGE', minAmount: '0', isActive: 'true' });
    setModalOpen(true);
  };

  const openEdit = (r: CommissionRule) => {
    setEditing(r);
    setForm({
      categoryId: r.categoryId,
      rate: String(r.rate),
      type: r.type,
      minAmount: String(r.minAmount),
      isActive: r.isActive ? 'true' : 'false',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const categoryId = form.categoryId.trim();
    if (!categoryId) {
      toast.error('Category is required');
      return;
    }
    const rate = Number(form.rate);
    if (Number.isNaN(rate)) {
      toast.error('Rate must be a number');
      return;
    }
    const minAmount = Number(form.minAmount);
    if (Number.isNaN(minAmount)) {
      toast.error('Min amount must be a number');
      return;
    }
    const isPercentage = form.type === 'PERCENTAGE';
    const body: Record<string, unknown> = {
      categorySlug: categoryId,
      rate,
      isPercentage,
      minOrder: minAmount,
    };
    try {
      setSaving(true);
      if (editing) {
        await apiUpdate('commission', editing.id, { ...body, isActive: form.isActive === 'true' });
        toast.success('Commission rule updated');
      } else {
        await apiCreate('commission', body);
        toast.success('Commission rule created');
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
      await apiDelete('commission', editing.id);
      toast.success('Commission rule deleted');
      setDeleteOpen(false);
      setEditing(null);
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<CommissionRule>[] = [
    { key: 'categoryId', header: 'Category', render: (r) => <span className="font-medium">{r.categoryId}</span> },
    {
      key: 'rate',
      header: 'Rate',
      render: (r) => (
        <span className="font-semibold text-primary-600">
          {r.type === 'PERCENTAGE' ? `${r.rate}%` : `₹${r.rate}`}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (r) => <Badge variant="info">{r.type === 'PERCENTAGE' ? 'Percentage' : 'Flat'}</Badge>,
    },
    { key: 'minAmount', header: 'Min amount (₹)', render: (r) => `₹${Number(r.minAmount).toLocaleString()}` },
    {
      key: 'isActive',
      header: 'Status',
      render: (r) => <Badge variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    { key: 'createdAt', header: 'Created', render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ];

  return (
    <>
      <AdminListPage<CommissionRule>
        title="Commission"
        section="commission"
        columns={columns}
        keyExtractor={(r) => r.id}
        searchKeys={['categoryId']}
        filterKey="isActive"
        filterOptions={['true', 'false']}
        refreshTrigger={refreshTrigger}
        normalizeItems={normalizeItems}
        onAdd={openAdd}
        addLabel="Add rule"
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
        title={editing ? 'Edit commission rule' : 'Create commission rule'}
        onSubmit={handleSave}
        loading={saving}
        wide
      >
        <FormField label="Category (slug or ID)">
          <FormInput
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            placeholder="e.g. smartphones or category id"
          />
        </FormField>
        <FormField label="Rate">
          <FormInput
            type="number"
            step="any"
            value={form.rate}
            onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
          />
        </FormField>
        <FormField label="Rate type">
          <FormSelect
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'PERCENTAGE' | 'FLAT' }))}
          >
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FLAT">Flat (₹)</option>
          </FormSelect>
        </FormField>
        <FormField label="Min order amount (₹)">
          <FormInput
            type="number"
            step="any"
            value={form.minAmount}
            onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value }))}
          />
        </FormField>
        {editing && (
          <FormField label="Status">
            <FormSelect value={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value }))}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </FormSelect>
          </FormField>
        )}
      </ActionModal>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete rule"
        message={`Delete commission rule for "${editing?.categoryId}"?`}
      />
    </>
  );
}
