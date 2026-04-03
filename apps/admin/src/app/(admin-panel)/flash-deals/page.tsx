'use client';

import { useState, useCallback, useMemo } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { FormField, FormInput, FormToggle } from '@/components/dashboard/form-field';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';
import { apiUpdate } from '@/lib/api';

interface FlashDealProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  isFlashDeal: boolean;
  flashDealEndsAt: string | null;
  category: { name: string } | null;
  seller: { storeName: string } | null;
}

function dealStatus(p: FlashDealProduct): 'Active' | 'Expired' {
  if (!p.isFlashDeal) return 'Expired';
  if (!p.flashDealEndsAt) return 'Active';
  const end = new Date(p.flashDealEndsAt).getTime();
  if (Number.isNaN(end)) return 'Active';
  return end >= Date.now() ? 'Active' : 'Expired';
}

const SV: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  Active: 'success',
  Expired: 'danger',
};

function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function FlashDealsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FlashDealProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ isFlashDeal: false, endsAt: '' });

  const flashDealQueryParams = useMemo(() => ({ limit: '200' }), []);
  const normalizeItems = useCallback((rows: FlashDealProduct[]) => rows.filter((p) => p.isFlashDeal), []);

  const openEdit = (p: FlashDealProduct) => {
    setEditing(p);
    setForm({
      isFlashDeal: p.isFlashDeal,
      endsAt: toLocalInputValue(p.flashDealEndsAt),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      await apiUpdate('products', editing.id, {
        isFlashDeal: form.isFlashDeal,
        ...(form.isFlashDeal && form.endsAt.trim()
          ? { flashDealEndsAt: new Date(form.endsAt).toISOString() }
          : {}),
      });
      toast.success('Flash deal settings updated');
      setModalOpen(false);
      setRefreshTrigger((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<FlashDealProduct>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Product',
      render: (r: FlashDealProduct) => (
        <div>
          <span className="font-medium">{r.name}</span>
          <p className="text-xs text-text-muted mt-0.5">{r.slug}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (r: FlashDealProduct) => r.category?.name ?? '—' },
    { key: 'seller', header: 'Seller', render: (r: FlashDealProduct) => r.seller?.storeName ?? '—' },
    {
      key: 'price',
      header: 'Price',
      render: (r: FlashDealProduct) => (
        <span>
          ₹{r.price.toLocaleString()}
          {r.compareAtPrice != null && r.compareAtPrice > r.price && (
            <span className="ml-1.5 text-xs text-text-muted line-through">₹{r.compareAtPrice.toLocaleString()}</span>
          )}
        </span>
      ),
    },
    { key: 'stock', header: 'Stock', render: (r: FlashDealProduct) => r.stock },
    {
      key: 'status',
      header: 'Deal status',
      render: (r: FlashDealProduct) => {
        const s = dealStatus(r);
        return <Badge variant={SV[s] ?? 'default'}>{s}</Badge>;
      },
    },
    {
      key: 'flashDealEndsAt',
      header: 'Ends',
      render: (r: FlashDealProduct) => (r.flashDealEndsAt ? new Date(r.flashDealEndsAt).toLocaleString() : '—'),
    },
  ], []);

  return (
    <>
      <AdminListPage<FlashDealProduct>
        title="Flash Deals"
        section="products"
        queryParams={flashDealQueryParams}
        normalizeItems={normalizeItems}
        columns={columns}
        keyExtractor={(r) => r.id}
        searchKeys={['name', 'slug']}
        refreshTrigger={refreshTrigger}
        renderActions={(r) => (
          <button
            type="button"
            onClick={() => openEdit(r)}
            className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-primary-600"
            title="Edit flash deal"
          >
            <Pencil size={15} />
          </button>
        )}
      />
      <ActionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Flash deal: ${editing.name}` : 'Flash deal'}
        onSubmit={handleSave}
        loading={saving}
        wide
      >
        {editing && (
          <div className="space-y-4">
            <FormToggle
              label="Flash deal active"
              checked={form.isFlashDeal}
              onChange={(checked) => setForm((f) => ({ ...f, isFlashDeal: checked }))}
            />
            <FormField label="Deal ends at (local time)">
              <FormInput
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                disabled={!form.isFlashDeal}
              />
            </FormField>
          </div>
        )}
      </ActionModal>
    </>
  );
}
