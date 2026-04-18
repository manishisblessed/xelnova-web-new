'use client';

import { useState, useCallback, useEffect } from 'react';
import { Badge, Button } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { FormField, FormInput, FormSelect } from '@/components/dashboard/form-field';
import { ChevronDown, ChevronRight, Loader2, Pencil, Save, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Column } from '@/components/dashboard/data-table';
import { apiCreate, apiUpdate, apiDelete, apiGet } from '@/lib/api';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

type Tab = 'CATEGORY' | 'SELLER';

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
  const isPct = r.type === 'PERCENTAGE' || r.type === 'percentage' || r.isPercentage === true;
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

interface SellerRow {
  id: string;
  storeName: string;
  email?: string | null;
  sellerCode?: string | null;
  commissionRate?: number | null;
  verified?: boolean;
  user?: { name?: string | null; email?: string | null; isBanned?: boolean } | null;
  _count?: { products: number };
}

interface SellerProductRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  commissionRate?: number | null;
  price: number;
  category?: { name: string } | null;
}

export default function CommissionPage() {
  const [tab, setTab] = useState<Tab>('CATEGORY');
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
      <DashboardHeader title="Commission" />
      <div className="px-6 pt-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-text-muted uppercase tracking-wide">View:</span>
          {(
            [
              { key: 'CATEGORY' as const, label: 'Category rules' },
              { key: 'SELLER' as const, label: 'Per-seller / per-product' },
            ]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-full border px-3 py-1.5 transition-colors ${
                tab === t.key
                  ? 'border-primary-500 bg-primary-500 text-white'
                  : 'border-border bg-surface text-text-secondary hover:border-primary-300 hover:text-primary-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'CATEGORY' ? (
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
      ) : (
        <SellerCommissionPanel />
      )}
    </>
  );
}

/**
 * Per-seller / per-product commission editor.
 *
 * Lists every seller with their default commission rate. Each row can be
 * expanded to show that seller's products with the per-listing override.
 * Both the seller default and individual product overrides are editable
 * inline so the catalogue team can fine-tune commercials without bouncing
 * between the Sellers and Products pages.
 */
function SellerCommissionPanel() {
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [productsBySeller, setProductsBySeller] = useState<Record<string, SellerProductRow[]>>({});
  const [productLoading, setProductLoading] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<SellerRow[]>('sellers');
      setSellers(res ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load sellers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = search
    ? sellers.filter((s) => {
        const q = search.toLowerCase();
        return (
          s.storeName?.toLowerCase().includes(q) ||
          (s.email ?? '').toLowerCase().includes(q) ||
          (s.user?.email ?? '').toLowerCase().includes(q) ||
          (s.sellerCode ?? '').toLowerCase().includes(q)
        );
      })
    : sellers;

  const expand = async (sellerId: string) => {
    if (expanded === sellerId) {
      setExpanded(null);
      return;
    }
    setExpanded(sellerId);
    if (productsBySeller[sellerId]) return;
    setProductLoading(sellerId);
    try {
      // Backend admin DTO uses `seller` (not `sellerId`) for the filter param.
      const res = await apiGet<SellerProductRow[]>('products', { seller: sellerId, limit: '500' });
      setProductsBySeller((prev) => ({ ...prev, [sellerId]: res ?? [] }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load seller products');
    } finally {
      setProductLoading(null);
    }
  };

  const draftKey = (kind: 'seller' | 'product', id: string) => `${kind}:${id}`;

  const setDraft = (kind: 'seller' | 'product', id: string, value: string) =>
    setDrafts((d) => ({ ...d, [draftKey(kind, id)]: value }));

  const getDraft = (kind: 'seller' | 'product', id: string, fallback: number | null | undefined) => {
    const k = draftKey(kind, id);
    return drafts[k] ?? (fallback != null ? String(fallback) : '');
  };

  const saveSellerRate = async (s: SellerRow) => {
    const raw = drafts[draftKey('seller', s.id)] ?? '';
    if (raw.trim() === '') {
      toast.error('Enter a number first');
      return;
    }
    const rate = Number(raw);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast.error('Commission must be between 0 and 100');
      return;
    }
    setSavingId(`seller:${s.id}`);
    try {
      await apiUpdate('sellers', s.id, { commissionRate: rate });
      toast.success(`${s.storeName}: default commission set to ${rate}%`);
      setSellers((arr) => arr.map((x) => (x.id === s.id ? { ...x, commissionRate: rate } : x)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingId(null);
    }
  };

  const saveProductRate = async (sellerId: string, p: SellerProductRow) => {
    const raw = drafts[draftKey('product', p.id)] ?? '';
    if (raw.trim() === '') {
      toast.error('Enter a number first');
      return;
    }
    const rate = Number(raw);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast.error('Commission must be between 0 and 100');
      return;
    }
    setSavingId(`product:${p.id}`);
    try {
      await apiUpdate('products', p.id, { commissionRate: rate });
      toast.success(`${p.name}: commission set to ${rate}%`);
      setProductsBySeller((prev) => ({
        ...prev,
        [sellerId]: (prev[sellerId] ?? []).map((x) =>
          x.id === p.id ? { ...x, commissionRate: rate } : x,
        ),
      }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 max-w-md">
        <Search size={18} className="text-text-muted shrink-0" />
        <input
          type="text"
          placeholder="Search sellers by store name, email or seller code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
        />
      </div>

      <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-text-muted">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-text-muted">No sellers found.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((s) => {
              const isOpen = expanded === s.id;
              const products = productsBySeller[s.id] ?? [];
              return (
                <li key={s.id}>
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-surface-muted/40">
                    <button
                      type="button"
                      onClick={() => void expand(s.id)}
                      className="p-1 rounded hover:bg-surface-muted text-text-muted"
                      title={isOpen ? 'Collapse products' : 'Expand products'}
                    >
                      {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-text-primary truncate">{s.storeName}</p>
                        {s.sellerCode && (
                          <span className="text-[11px] font-mono text-text-muted">{s.sellerCode}</span>
                        )}
                        <Badge variant={s.verified ? 'success' : 'warning'}>
                          {s.verified ? 'Verified' : 'Pending'}
                        </Badge>
                        <span className="text-xs text-text-muted">
                          · {s._count?.products ?? 0} products
                        </span>
                      </div>
                      <p className="text-xs text-text-muted truncate">
                        {s.email ?? s.user?.email ?? '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-text-muted">Default %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={getDraft('seller', s.id, s.commissionRate)}
                        onChange={(e) => setDraft('seller', s.id, e.target.value)}
                        placeholder={s.commissionRate != null ? String(s.commissionRate) : '10'}
                        className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm font-semibold text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        loading={savingId === `seller:${s.id}`}
                        onClick={() => void saveSellerRate(s)}
                      >
                        <Save size={14} /> Save
                      </Button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="bg-surface-muted/30 border-t border-border px-4 py-3">
                      {productLoading === s.id ? (
                        <div className="flex items-center gap-2 py-3 text-sm text-text-muted">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading products…
                        </div>
                      ) : products.length === 0 ? (
                        <p className="py-3 text-sm text-text-muted">
                          This seller has no products yet.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead className="text-text-muted">
                              <tr>
                                <th className="px-2 py-1.5 text-left">Product</th>
                                <th className="px-2 py-1.5 text-left">Category</th>
                                <th className="px-2 py-1.5 text-left">Status</th>
                                <th className="px-2 py-1.5 text-right">Price</th>
                                <th className="px-2 py-1.5 text-right">Commission %</th>
                                <th className="px-2 py-1.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {products.map((p) => (
                                <tr key={p.id} className="border-t border-border align-middle">
                                  <td className="px-2 py-1.5">
                                    <p className="font-medium text-text-primary truncate max-w-[260px]" title={p.name}>
                                      {p.name}
                                    </p>
                                  </td>
                                  <td className="px-2 py-1.5 text-text-secondary">
                                    {p.category?.name ?? '—'}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <Badge
                                      variant={
                                        p.status === 'ACTIVE'
                                          ? 'success'
                                          : p.status === 'REJECTED'
                                            ? 'danger'
                                            : 'warning'
                                      }
                                    >
                                      {p.status}
                                    </Badge>
                                  </td>
                                  <td className="px-2 py-1.5 text-right text-text-secondary">
                                    ₹{Number(p.price).toLocaleString()}
                                  </td>
                                  <td className="px-2 py-1.5 text-right">
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      step={0.5}
                                      value={getDraft('product', p.id, p.commissionRate)}
                                      onChange={(e) => setDraft('product', p.id, e.target.value)}
                                      placeholder={
                                        p.commissionRate != null
                                          ? String(p.commissionRate)
                                          : s.commissionRate != null
                                            ? String(s.commissionRate)
                                            : '—'
                                      }
                                      className="w-20 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-semibold text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 text-right">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      loading={savingId === `product:${p.id}`}
                                      onClick={() => void saveProductRate(s.id, p)}
                                    >
                                      <Save size={12} /> Save
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
