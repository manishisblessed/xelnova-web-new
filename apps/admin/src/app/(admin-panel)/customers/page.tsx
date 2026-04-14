'use client';

import { useEffect, useState, useMemo } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { AdminActionsDropdown } from '@/components/dashboard/admin-actions-dropdown';
import { FormField, FormSelect } from '@/components/dashboard/form-field';
import { Ban, Pencil, Trash2, UserCheck, UserMinus, Info } from 'lucide-react';
import { toast } from 'sonner';
import { apiUpdate, apiDelete } from '@/lib/api';
import type { Column } from '@/components/dashboard/data-table';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  emailVerified: boolean;
  isActive: boolean;
  isBanned: boolean;
  banReason: string | null;
  aadhaarVerified?: boolean;
  createdAt: string;
  _count: { orders: number };
}

const DEFAULT_BAN = 'Suspended by admin';

export default function CustomersPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [formEmailVerified, setFormEmailVerified] = useState('true');
  const [saving, setSaving] = useState(false);

  const queryParams = useMemo(() => ({ role: 'CUSTOMER' }), []);

  useEffect(() => {
    if (!selected || !editOpen) return;
    setFormEmailVerified(String(selected.emailVerified));
  }, [selected, editOpen]);

  const openEdit = (c: Customer) => {
    setSelected(c);
    setFormEmailVerified(String(c.emailVerified));
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await apiUpdate('customers', selected.id, {
        emailVerified: formEmailVerified === 'true',
      });
      toast.success('Customer updated');
      setEditOpen(false);
      setSelected(null);
      setRefreshTrigger((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  const suspend = async (c: Customer) => {
    try {
      await apiUpdate('customers', c.id, { isBanned: true, banReason: DEFAULT_BAN });
      toast.success('Account suspended');
      setRefreshTrigger((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to suspend');
    }
  };

  const activate = async (c: Customer) => {
    try {
      await apiUpdate('customers', c.id, { isBanned: false, banReason: '' });
      toast.success('Account reactivated');
      setRefreshTrigger((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to activate');
    }
  };

  const deactivate = async (c: Customer) => {
    try {
      await apiUpdate('customers', c.id, { isActive: false });
      toast.success('Account deactivated');
      setRefreshTrigger((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to deactivate');
    }
  };

  const reenable = async (c: Customer) => {
    try {
      await apiUpdate('customers', c.id, { isActive: true });
      toast.success('Account enabled');
      setRefreshTrigger((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to enable account');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete('customers', deleteTarget.id);
      toast.success('User deleted');
      setDeleteTarget(null);
      setRefreshTrigger((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Customer>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone', render: (r) => r.phone ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        if (r.isBanned) return <Badge variant="danger">Suspended</Badge>;
        if (!r.isActive) return <Badge variant="warning">Inactive</Badge>;
        return <Badge variant="success">Active</Badge>;
      },
    },
    {
      key: 'emailVerified',
      header: 'Email',
      render: (r) => (
        <Badge variant={r.emailVerified ? 'success' : 'default'}>{r.emailVerified ? 'Verified' : 'Unverified'}</Badge>
      ),
    },
    {
      key: 'aadhaarVerified',
      header: 'Aadhaar (Wallet)',
      render: (r) => (
        <Badge variant={r.aadhaarVerified ? 'success' : 'warning'}>
          {r.aadhaarVerified ? 'Verified' : 'Not Verified'}
        </Badge>
      ),
    },
    { key: '_count', header: 'Orders', render: (r) => r._count.orders },
    { key: 'createdAt', header: 'Joined', render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ];

  return (
    <>
      {/* Info Note */}
      <div className="mx-6 mt-6 mb-0">
        <div className="flex items-start gap-3 rounded-xl border border-info-200 bg-info-50 p-4">
          <Info size={20} className="text-info-600 shrink-0 mt-0.5" />
          <div className="text-sm text-info-800">
            <p className="font-semibold mb-1">Customers vs Sellers</p>
            <p className="text-info-700">
              A user can be both a customer and a seller, but they are separate entities. 
              Customers place orders and manage their shopping experience here. 
              Sellers manage their stores and products in the <strong>Sellers</strong> section.
            </p>
            <p className="text-info-700 mt-2">
              <strong>Wallet:</strong> Customers must verify their Aadhaar via DigiLocker before adding funds to their wallet.
            </p>
          </div>
        </div>
      </div>

      <AdminListPage<Customer>
        title="Customers"
        section="customers"
        columns={columns}
        keyExtractor={(r) => r.id}
        searchKeys={['name', 'email', 'phone']}
        refreshTrigger={refreshTrigger}
        queryParams={queryParams}
        renderActions={(r) => (
          <div className="flex justify-end">
            <AdminActionsDropdown
              items={[
                { key: 'edit', label: 'Edit', icon: <Pencil size={14} />, onClick: () => openEdit(r), disabled: false },
                ...(r.isBanned
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
                ...(r.isBanned
                  ? []
                  : r.isActive
                    ? [
                        {
                          key: 'deactivate',
                          label: 'Deactivate',
                          icon: <UserMinus size={14} />,
                          onClick: () => void deactivate(r),
                        },
                      ]
                    : [
                        {
                          key: 'reenable',
                          label: 'Enable account',
                          icon: <UserCheck size={14} />,
                          onClick: () => void reenable(r),
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
        title={selected?.name ?? 'Customer'}
        wide
        onSubmit={handleSave}
        submitLabel="Save changes"
        loading={saving}
      >
        {selected && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-muted">Email:</span> {selected.email}
              </div>
              <div>
                <span className="text-text-muted">Phone:</span> {selected.phone ?? '—'}
              </div>
              <div>
                <span className="text-text-muted">Orders:</span> {selected._count.orders}
              </div>
              <div>
                <span className="text-text-muted">Joined:</span>{' '}
                {new Date(selected.createdAt).toLocaleDateString()}
              </div>
              <div>
                <span className="text-text-muted">Aadhaar:</span>{' '}
                <Badge variant={selected.aadhaarVerified ? 'success' : 'warning'} className="ml-1">
                  {selected.aadhaarVerified ? 'Verified (can use wallet)' : 'Not verified'}
                </Badge>
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <FormField label="Email verified">
                <FormSelect value={formEmailVerified} onChange={(e) => setFormEmailVerified(e.target.value)}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </FormSelect>
              </FormField>
            </div>
          </div>
        )}
      </ActionModal>
      <ActionModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete user?"
        submitLabel="Delete"
        submitVariant="danger"
        onSubmit={() => void handleDelete()}
        loading={deleting}
      >
        <p className="text-sm text-text-muted">
          This cannot be undone. Users with orders or listed products cannot be deleted.
        </p>
        {deleteTarget && (
          <p className="text-sm text-text-primary pt-2">
            Remove <strong>{deleteTarget.name}</strong> ({deleteTarget.email})?
          </p>
        )}
      </ActionModal>
    </>
  );
}
