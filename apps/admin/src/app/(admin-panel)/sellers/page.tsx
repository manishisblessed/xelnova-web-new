'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { AdminActionsDropdown } from '@/components/dashboard/admin-actions-dropdown';
import { FormField, FormSelect } from '@/components/dashboard/form-field';
import { Ban, Pencil, Trash2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { apiUpdate, apiDelete } from '@/lib/api';
import type { Column } from '@/components/dashboard/data-table';

interface Seller {
  id: string;
  storeName: string;
  email?: string | null;
  phone?: string | null;
  verified: boolean;
  rating: number;
  totalSales: number;
  createdAt: string;
  user?: {
    name: string;
    email: string;
    phone: string | null;
    isBanned?: boolean;
    banReason?: string | null;
  } | null;
  _count: { products: number };
}

const DEFAULT_BAN = 'Suspended by admin';

export default function SellersPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Seller | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Seller | null>(null);
  const [formVerified, setFormVerified] = useState('true');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selected || !editOpen) return;
    setFormVerified(String(selected.verified));
  }, [selected, editOpen]);

  const openEdit = (s: Seller) => {
    setSelected(s);
    setFormVerified(String(s.verified));
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await apiUpdate('sellers', selected.id, {
        verified: formVerified === 'true',
      });
      toast.success('Seller updated');
      setEditOpen(false);
      setSelected(null);
      setRefreshTrigger((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update seller');
    } finally {
      setSaving(false);
    }
  };

  const suspend = async (s: Seller) => {
    try {
      await apiUpdate('sellers', s.id, { isBanned: true, banReason: DEFAULT_BAN });
      toast.success('Seller account suspended');
      setRefreshTrigger((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to suspend');
    }
  };

  const activate = async (s: Seller) => {
    try {
      await apiUpdate('sellers', s.id, { isBanned: false, banReason: '' });
      toast.success('Seller account reactivated');
      setRefreshTrigger((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to activate');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete('sellers', deleteTarget.id);
      toast.success('Seller removed');
      setDeleteTarget(null);
      setRefreshTrigger((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Seller>[] = [
    {
      key: 'storeName',
      header: 'Store',
      className: 'min-w-[10rem] max-w-[13rem]',
      render: (r) => (
        <span className="block truncate font-medium" title={r.storeName}>
          {r.storeName}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Owner',
      className: 'min-w-[7.5rem] max-w-[11rem]',
      render: (r) => {
        const name = r.user?.name ?? '—';
        return (
          <span className="block truncate" title={name}>
            {name}
          </span>
        );
      },
    },
    {
      key: 'email',
      header: 'Email',
      className: 'min-w-[11rem] max-w-[15rem]',
      render: (r) => {
        const email = r.email ?? r.user?.email ?? '—';
        return (
          <span className="block truncate" title={email}>
            {email}
          </span>
        );
      },
    },
    {
      key: 'phone',
      header: 'Phone',
      className: 'min-w-[8rem] max-w-[10rem] whitespace-nowrap',
      render: (r) => {
        const phone = r.phone ?? r.user?.phone ?? '—';
        return (
          <span className="block truncate" title={phone}>
            {phone}
          </span>
        );
      },
    },
    {
      key: 'account',
      header: 'Account',
      className: 'whitespace-nowrap w-28',
      render: (r) =>
        r.user?.isBanned ? (
          <Badge variant="danger">Suspended</Badge>
        ) : (
          <Badge variant="success">Active</Badge>
        ),
    },
    { key: '_count', header: 'Products', className: 'whitespace-nowrap text-right tabular-nums w-16', render: (r) => r._count.products },
    { key: 'totalSales', header: 'Sales', className: 'whitespace-nowrap tabular-nums min-w-[6rem]', render: (r) => `₹${r.totalSales.toLocaleString()}` },
    {
      key: 'verified',
      header: 'Verified',
      className: 'whitespace-nowrap w-[7.5rem]',
      render: (r) => (
        <Badge variant={r.verified ? 'success' : 'default'}>{r.verified ? 'Verified' : 'Unverified'}</Badge>
      ),
    },
    { key: 'rating', header: 'Rating', className: 'whitespace-nowrap tabular-nums w-14 text-right', render: (r) => `${r.rating.toFixed(1)} ★` },
    { key: 'createdAt', header: 'Joined', className: 'whitespace-nowrap min-w-[6.5rem]', render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ];

  return (
    <>
      <AdminListPage<Seller>
        title="Sellers"
        section="sellers"
        columns={columns}
        keyExtractor={(r) => r.id}
        searchKeys={['storeName']}
        filterKey="verified"
        filterOptions={['true', 'false']}
        refreshTrigger={refreshTrigger}
        renderActions={(r) => (
          <div className="flex justify-end">
            <AdminActionsDropdown
              items={[
                { key: 'edit', label: 'Edit', icon: <Pencil size={14} />, onClick: () => openEdit(r) },
                ...(r.user?.isBanned
                  ? [
                      {
                        key: 'activate',
                        label: 'Reactivate',
                        icon: <UserCheck size={14} />,
                        onClick: () => void activate(r),
                      },
                    ]
                  : [
                      {
                        key: 'suspend',
                        label: 'Suspend',
                        icon: <Ban size={14} />,
                        onClick: () => void suspend(r),
                      },
                    ]),
                {
                  key: 'delete',
                  label: 'Delete',
                  icon: <Trash2 size={14} />,
                  danger: true,
                  onClick: () => setDeleteTarget(r),
                },
              ]}
            />
          </div>
        )}
      />
      <ActionModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelected(null);
        }}
        title={selected?.storeName ?? 'Seller'}
        wide
        onSubmit={handleSave}
        submitLabel="Save changes"
        loading={saving}
      >
        {selected && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-muted">Owner:</span> {selected.user?.name ?? '—'}
              </div>
              <div>
                <span className="text-text-muted">Email:</span> {selected.email ?? selected.user?.email ?? '—'}
              </div>
              <div>
                <span className="text-text-muted">Phone:</span> {selected.phone ?? selected.user?.phone ?? '—'}
              </div>
              <div>
                <span className="text-text-muted">Products:</span> {selected._count.products}
              </div>
              <div>
                <span className="text-text-muted">Total sales:</span> ₹{selected.totalSales.toLocaleString()}
              </div>
              <div>
                <span className="text-text-muted">Rating:</span> {selected.rating.toFixed(1)} ★
              </div>
              <div>
                <span className="text-text-muted">Joined:</span>{' '}
                {new Date(selected.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
              <FormField label="Verified">
                <FormSelect value={formVerified} onChange={(e) => setFormVerified(e.target.value)}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </FormSelect>
              </FormField>
            </div>
            <p className="text-xs text-text-muted leading-relaxed rounded-lg border border-border/60 bg-surface-muted/40 px-3 py-2">
              Commission is set per product when you approve it from the
              Products page — it&apos;s no longer a seller-level setting.
            </p>
          </div>
        )}
      </ActionModal>
      <ActionModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Suspend seller?"
        submitLabel="Suspend"
        submitVariant="danger"
        onSubmit={() => void handleDelete()}
        loading={deleting}
      >
        <p className="text-sm text-text-muted">
          Suspends the seller account and deactivates all their products from the storefront. The seller will no longer be able to access their dashboard.
        </p>
        <ul className="mt-2 text-xs text-text-muted space-y-1 list-disc list-inside">
          <li>All products will be hidden from customers</li>
          <li>Seller role will be downgraded to customer</li>
          <li>Order history and data will be preserved</li>
          <li>The account can be reactivated later if needed</li>
        </ul>
        {deleteTarget && (
          <p className="text-sm text-text-primary pt-3">
            Suspend <strong>{deleteTarget.storeName}</strong> ({deleteTarget.email ?? deleteTarget.user?.email ?? '—'})?
          </p>
        )}
      </ActionModal>
    </>
  );
}
