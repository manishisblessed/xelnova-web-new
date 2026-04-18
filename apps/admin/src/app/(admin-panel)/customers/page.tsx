'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@xelnova/ui';
import { AdminListPage } from '@/components/dashboard/admin-list-page';
import { ActionModal } from '@/components/dashboard/action-modal';
import { AdminActionsDropdown } from '@/components/dashboard/admin-actions-dropdown';
import { FormField, FormSelect } from '@/components/dashboard/form-field';
import { Ban, Eye, Pencil, Trash2, UserCheck, UserMinus, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiUpdate, apiDelete, apiGetAdminCustomerDetail } from '@/lib/api';
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

interface CustomerDetail {
  user: Customer & {
    addresses?: Array<{
      id: string;
      label?: string | null;
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
      isDefault?: boolean;
    }>;
  };
  stats: {
    totalOrders: number;
    totalSpent: number;
    pendingReturns: number;
    openTickets: number;
  };
  orders: Array<{
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    paymentStatus?: string | null;
    createdAt: string;
    seller?: { storeName?: string | null } | null;
    items?: Array<{
      productName: string;
      quantity: number;
      price: number;
    }>;
    shipment?: { status?: string | null; awb?: string | null; courier?: string | null } | null;
  }>;
  returnRequests: Array<{
    id: string;
    status: string;
    reason: string;
    refundAmount?: number | null;
    createdAt: string;
    order?: {
      id: string;
      orderNumber: string;
      total: number;
      items?: Array<{ productName: string; quantity: number; price: number }>;
    } | null;
  }>;
  tickets: Array<{
    id: string;
    subject?: string | null;
    status: string;
    priority?: string | null;
    createdAt: string;
  }>;
  wallet: {
    id: string;
    balance: number;
    transactions: Array<{
      id: string;
      type: string;
      amount: number;
      description?: string | null;
      createdAt: string;
    }>;
  } | null;
}

const DEFAULT_BAN = 'Suspended by admin';
const ROLE_OPTIONS = ['ALL', 'CUSTOMER', 'SELLER', 'SUPPORT'] as const;

function fmtMoney(n: number | null | undefined) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return `₹${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function CustomersPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [formEmailVerified, setFormEmailVerified] = useState('true');
  const [saving, setSaving] = useState(false);
  const [roleFilter, setRoleFilter] = useState<typeof ROLE_OPTIONS[number]>('ALL');

  // Detail drawer state — full purchase / refund / wallet history.
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailHeader, setDetailHeader] = useState<Customer | null>(null);

  const queryParams = useMemo(
    () => (roleFilter === 'ALL' ? undefined : { role: roleFilter }),
    [roleFilter],
  );

  useEffect(() => {
    if (!selected || !editOpen) return;
    setFormEmailVerified(String(selected.emailVerified));
  }, [selected, editOpen]);

  const openEdit = (c: Customer) => {
    setSelected(c);
    setFormEmailVerified(String(c.emailVerified));
    setEditOpen(true);
  };

  const openDetail = async (c: Customer) => {
    setDetailHeader(c);
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const data = await apiGetAdminCustomerDetail<CustomerDetail>(c.id);
      setDetail(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load customer details');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
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
    {
      key: 'name',
      header: 'Name',
      render: (r) => (
        <button
          type="button"
          onClick={() => void openDetail(r)}
          className="font-medium text-text-primary hover:text-primary-600 hover:underline text-left"
          title="Open full purchase history"
        >
          {r.name || '—'}
        </button>
      ),
    },
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Role',
      render: (r) => {
        const variant =
          r.role === 'SELLER' ? 'info' : r.role === 'SUPPORT' ? 'warning' : 'default';
        return <Badge variant={variant}>{r.role}</Badge>;
      },
    },
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
            <p className="font-semibold mb-1">All non-admin accounts</p>
            <p className="text-info-700">
              This list now includes <strong>customers, sellers and support staff</strong>.
              Use the role filter to narrow down. Click a name (or the eye icon) to open a
              full <strong>360° view</strong> with order history, refunds, support tickets and
              wallet transactions — useful when answering refund questions.
            </p>
            <p className="text-info-700 mt-2">
              <strong>Wallet:</strong> Customers must verify their Aadhaar via DigiLocker before adding funds to their wallet.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-text-muted uppercase tracking-wide">Role:</span>
          {ROLE_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRoleFilter(r);
                setRefreshTrigger((n) => n + 1);
              }}
              className={`rounded-full border px-3 py-1 transition-colors ${
                roleFilter === r
                  ? 'border-primary-500 bg-primary-500 text-white'
                  : 'border-border bg-surface text-text-secondary hover:border-primary-300 hover:text-primary-600'
              }`}
            >
              {r === 'ALL' ? 'All accounts' : r.charAt(0) + r.slice(1).toLowerCase()}
            </button>
          ))}
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
                { key: 'view', label: 'View history', icon: <Eye size={14} />, onClick: () => void openDetail(r) },
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
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetail(null);
          setDetailHeader(null);
        }}
        title={detailHeader?.name ? `${detailHeader.name} — full history` : 'Customer history'}
        extraWide
      >
        {detailLoading && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <p className="text-sm">Loading customer history…</p>
          </div>
        )}
        {!detailLoading && detail && (
          <div className="space-y-6">
            {/* Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border border-border bg-surface-muted/40 px-3 py-2">
                <p className="text-text-muted">Total orders</p>
                <p className="text-lg font-semibold text-text-primary">{detail.stats.totalOrders}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted/40 px-3 py-2">
                <p className="text-text-muted">Total spent</p>
                <p className="text-lg font-semibold text-text-primary">{fmtMoney(detail.stats.totalSpent)}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted/40 px-3 py-2">
                <p className="text-text-muted">Pending returns</p>
                <p className="text-lg font-semibold text-text-primary">{detail.stats.pendingReturns}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted/40 px-3 py-2">
                <p className="text-text-muted">Open tickets</p>
                <p className="text-lg font-semibold text-text-primary">{detail.stats.openTickets}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-text-muted">Email:</span> {detail.user.email}
              </div>
              <div>
                <span className="text-text-muted">Phone:</span> {detail.user.phone ?? '—'}
              </div>
              <div>
                <span className="text-text-muted">Role:</span> {detail.user.role}
              </div>
              <div>
                <span className="text-text-muted">Wallet balance:</span>{' '}
                {detail.wallet ? fmtMoney(detail.wallet.balance) : '—'}
              </div>
            </div>

            {/* Orders */}
            <section>
              <h3 className="text-sm font-semibold text-text-primary mb-2">
                Order history ({detail.orders.length})
              </h3>
              {detail.orders.length === 0 ? (
                <p className="text-sm text-text-muted">No orders yet.</p>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-surface-muted/50 text-text-muted">
                        <tr>
                          <th className="px-3 py-2 text-left">Order #</th>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-left">Seller</th>
                          <th className="px-3 py-2 text-left">Items</th>
                          <th className="px-3 py-2 text-right">Total</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.orders.map((o) => (
                          <tr key={o.id} className="border-t border-border align-top">
                            <td className="px-3 py-2 font-medium text-text-primary">{o.orderNumber}</td>
                            <td className="px-3 py-2 text-text-secondary">
                              {new Date(o.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2 text-text-secondary">{o.seller?.storeName ?? '—'}</td>
                            <td className="px-3 py-2 text-text-secondary">
                              {(o.items ?? []).slice(0, 3).map((it, i) => (
                                <div key={i} className="truncate max-w-[260px]" title={it.productName}>
                                  {it.quantity}× {it.productName}
                                  <span className="text-text-muted"> · {fmtMoney(it.price)}</span>
                                </div>
                              ))}
                              {(o.items?.length ?? 0) > 3 && (
                                <span className="text-text-muted">
                                  +{(o.items?.length ?? 0) - 3} more
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-text-primary">
                              {fmtMoney(o.total)}
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="default">{o.status}</Badge>
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant={o.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                                {o.paymentStatus ?? '—'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            {/* Returns / Refunds */}
            <section>
              <h3 className="text-sm font-semibold text-text-primary mb-2">
                Returns &amp; refunds ({detail.returnRequests.length})
              </h3>
              {detail.returnRequests.length === 0 ? (
                <p className="text-sm text-text-muted">No return requests.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.returnRequests.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl border border-border bg-surface-muted/30 px-3 py-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-text-primary">
                          Order {r.order?.orderNumber ?? '—'}
                        </span>
                        <span className="text-text-muted">{new Date(r.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            r.status === 'REFUNDED'
                              ? 'success'
                              : r.status === 'REJECTED'
                                ? 'danger'
                                : 'warning'
                          }
                        >
                          {r.status}
                        </Badge>
                        <span className="text-text-secondary">Reason: {r.reason}</span>
                        <span className="text-text-secondary">
                          Refund: {fmtMoney(r.refundAmount ?? null)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Tickets */}
            <section>
              <h3 className="text-sm font-semibold text-text-primary mb-2">
                Support tickets ({detail.tickets.length})
              </h3>
              {detail.tickets.length === 0 ? (
                <p className="text-sm text-text-muted">No tickets raised.</p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {detail.tickets.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-xl border border-border bg-surface-muted/30 px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-text-primary">{t.subject ?? 'Ticket'}</span>
                        <Badge variant={t.status === 'CLOSED' ? 'success' : 'warning'}>{t.status}</Badge>
                      </div>
                      <p className="mt-1 text-text-muted">
                        {new Date(t.createdAt).toLocaleString()}
                        {t.priority && <span className="ml-2">· Priority: {t.priority}</span>}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Wallet */}
            <section>
              <h3 className="text-sm font-semibold text-text-primary mb-2">Wallet</h3>
              {!detail.wallet ? (
                <p className="text-sm text-text-muted">No wallet on file for this user.</p>
              ) : (
                <>
                  <p className="text-sm text-text-secondary mb-2">
                    Balance:{' '}
                    <span className="font-semibold text-text-primary">{fmtMoney(detail.wallet.balance)}</span>
                  </p>
                  {detail.wallet.transactions.length === 0 ? (
                    <p className="text-sm text-text-muted">No transactions.</p>
                  ) : (
                    <div className="rounded-xl border border-border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-surface-muted/50 text-text-muted">
                            <tr>
                              <th className="px-3 py-2 text-left">When</th>
                              <th className="px-3 py-2 text-left">Type</th>
                              <th className="px-3 py-2 text-right">Amount</th>
                              <th className="px-3 py-2 text-left">Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.wallet.transactions.map((t) => (
                              <tr key={t.id} className="border-t border-border">
                                <td className="px-3 py-2 text-text-secondary">
                                  {new Date(t.createdAt).toLocaleString()}
                                </td>
                                <td className="px-3 py-2">
                                  <Badge
                                    variant={
                                      t.type === 'CREDIT' || t.type === 'RECHARGE' || t.type === 'REFUND'
                                        ? 'success'
                                        : 'warning'
                                    }
                                  >
                                    {t.type}
                                  </Badge>
                                </td>
                                <td
                                  className={`px-3 py-2 text-right font-semibold ${
                                    Number(t.amount) >= 0 ? 'text-success-600' : 'text-danger-600'
                                  }`}
                                >
                                  {Number(t.amount) >= 0 ? '+' : ''}
                                  {fmtMoney(Math.abs(Number(t.amount)))}
                                </td>
                                <td className="px-3 py-2 text-text-secondary">{t.description ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
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
