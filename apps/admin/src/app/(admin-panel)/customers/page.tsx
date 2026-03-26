'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { AdminActionsDropdown } from '@/components/dashboard/admin-actions-dropdown';
import { FormField, FormSelect } from '@/components/dashboard/form-field';
import { Ban, Pencil, Trash2, UserCheck, UserMinus } from 'lucide-react';
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
  createdAt: string;
  _count: { orders: number };
}

const ROLES = ['CUSTOMER', 'SELLER', 'ADMIN'] as const;

const ROLE_BADGE: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  CUSTOMER: 'default',
  SELLER: 'success',
  ADMIN: 'danger',
};

const DEFAULT_BAN = 'Suspended by admin';

export default function CustomersPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [formRole, setFormRole] = useState('');
  const [formEmailVerified, setFormEmailVerified] = useState('true');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selected || !editOpen) return;
    setFormRole(selected.role);
    setFormEmailVerified(String(selected.emailVerified));
  }, [selected, editOpen]);

  const isAdminRow = (c: Customer) => c.role === 'ADMIN';

  const openEdit = (c: Customer) => {
    setSelected(c);
    setFormRole(c.role);
    setFormEmailVerified(String(c.emailVerified));
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await apiUpdate('customers', selected.id, {
        role: formRole,
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
      key: 'role',
      header: 'Role',
      render: (r) => (
        <Badge variant={ROLE_BADGE[r.role] ?? 'default'}>
          {r.role.charAt(0) + r.role.slice(1).toLowerCase()}
        </Badge>
      ),
    },
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
      header: 'Email verified',
      render: (r) => (
        <Badge variant={r.emailVerified ? 'success' : 'default'}>{r.emailVerified ? 'Verified' : 'Unverified'}</Badge>
      ),
    },
    { key: '_count', header: 'Orders', render: (r) => r._count.orders },
    { key: 'createdAt', header: 'Joined', render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ];

  return (
    <>
      <AdminListPage<Customer>
        title="Customers"
        section="customers"
        columns={columns}
        keyExtractor={(r) => r.id}
        searchKeys={['name', 'email', 'phone']}
        refreshTrigger={refreshTrigger}
        renderActions={(r) => (
          <div className="flex justify-end">
            <AdminActionsDropdown
              items={[
                { key: 'edit', label: 'Edit', icon: <Pencil size={14} />, onClick: () => openEdit(r), disabled: false },
                ...(isAdminRow(r)
                  ? []
                  : r.isBanned
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
                ...(isAdminRow(r) || r.isBanned
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
                ...(isAdminRow(r)
                  ? []
                  : [
                      {
                        key: 'delete',
                        label: 'Delete',
                        icon: <Trash2 size={14} />,
                        danger: true,
                        onClick: () => setDeleteTarget(r),
                      },
                    ]),
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
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
              <FormField label="Role">
                <FormSelect value={formRole} onChange={(e) => setFormRole(e.target.value)}>
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
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
