'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
  RefreshCw,
  Loader2,
  X,
  ListOrdered,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Badge } from '@xelnova/ui';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StatCard } from '@/components/dashboard/stat-card';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '') || '/api/v1';

type OwnerType = 'ADMIN' | 'SELLER' | 'CUSTOMER';

interface WalletTxn {
  id: string;
  type: string;
  amount: number;
  balanceAfter?: number;
  description: string;
  referenceType?: string;
  referenceId?: string | null;
  createdAt: string;
}

interface WalletItem {
  id: string;
  ownerId: string;
  ownerType: OwnerType;
  balance: number;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
  updatedAt: string;
  transactions: WalletTxn[];
}

const OWNER_FILTERS: Array<{ key: 'ALL' | OwnerType; label: string }> = [
  { key: 'ALL', label: 'All wallets' },
  { key: 'CUSTOMER', label: 'Customers' },
  { key: 'SELLER', label: 'Sellers' },
  { key: 'ADMIN', label: 'Admin' },
];

function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith('xelnova-dashboard-token='))
    ?.split('=')[1] ?? null;
}

function fmtMoney(n: number) {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ownerBadgeVariant(t: OwnerType): 'default' | 'success' | 'warning' | 'info' {
  if (t === 'ADMIN') return 'default';
  if (t === 'SELLER') return 'success';
  return 'info';
}

function txnBadgeVariant(type: string): 'success' | 'warning' | 'danger' | 'default' | 'info' {
  const upper = type.toUpperCase();
  if (upper.includes('CREDIT') || upper.includes('RECHARGE') || upper.includes('REFUND') || upper.includes('TOPUP')) {
    return 'success';
  }
  if (upper.includes('DEBIT') || upper.includes('WITHDRAW') || upper.includes('PAYOUT')) {
    return 'danger';
  }
  return 'default';
}

export default function WalletsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const initialOwnerParam = (searchParams.get('ownerType') || 'ALL').toUpperCase();
  const [ownerFilter, setOwnerFilter] = useState<'ALL' | OwnerType>(
    (['ALL', 'ADMIN', 'SELLER', 'CUSTOMER'] as const).includes(initialOwnerParam as 'ALL' | OwnerType)
      ? (initialOwnerParam as 'ALL' | OwnerType)
      : 'ALL',
  );

  // Keep `ownerFilter` in lock-step with the `?ownerType=` URL param so
  // the KPI tiles can deep-link straight into a filtered list (and the
  // back/forward buttons just work).
  useEffect(() => {
    const next = (searchParams.get('ownerType') || 'ALL').toUpperCase() as 'ALL' | OwnerType;
    const valid = (['ALL', 'ADMIN', 'SELLER', 'CUSTOMER'] as const).includes(next);
    if (valid && next !== ownerFilter) setOwnerFilter(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setOwnerFilterAndUrl = useCallback(
    (next: 'ALL' | OwnerType) => {
      setOwnerFilter(next);
      setPagination((p) => ({ ...p, page: 1 }));
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'ALL') params.delete('ownerType');
      else params.set('ownerType', next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const [actionModal, setActionModal] = useState<{ type: 'credit' | 'debit'; wallet: WalletItem } | null>(null);
  const [actionAmount, setActionAmount] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [txnModalWallet, setTxnModalWallet] = useState<WalletItem | null>(null);
  const [txnList, setTxnList] = useState<WalletTxn[]>([]);
  const [txnLoading, setTxnLoading] = useState(false);

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (ownerFilter !== 'ALL') params.set('ownerType', ownerFilter);
      const res = await fetch(`${API_BASE}/wallet/admin/all?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : {}),
        },
      });
      const data = await res.json();
      if (data.success) {
        setWallets(data.data.wallets);
        setPagination((prev) => ({ ...prev, ...data.data.pagination }));
      }
    } catch {
      toast.error('Failed to load wallets');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, ownerFilter]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const handleAction = async () => {
    if (!actionModal) return;
    const amount = parseFloat(actionAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!actionDescription.trim()) {
      toast.error('Enter a description');
      return;
    }

    setActionLoading(true);
    try {
      const token = getAuthToken();
      const endpoint = actionModal.type === 'credit'
        ? `${API_BASE}/wallet/admin/credit/${actionModal.wallet.id}`
        : `${API_BASE}/wallet/admin/debit/${actionModal.wallet.id}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : {}),
        },
        body: JSON.stringify({
          amount,
          description: actionDescription.trim(),
          referenceType: 'MANUAL',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Wallet ${actionModal.type}ed successfully`);
        setActionModal(null);
        setActionAmount('');
        setActionDescription('');
        fetchWallets();
      } else {
        toast.error(data.message || 'Action failed');
      }
    } catch {
      toast.error('Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openTransactions = async (w: WalletItem) => {
    setTxnModalWallet(w);
    setTxnList([]);
    setTxnLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/wallet/admin/transactions/${w.id}?limit=200`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : {}),
        },
      });
      const data = await res.json();
      if (data.success) {
        setTxnList(data.data.transactions);
      } else {
        toast.error(data.message || 'Failed to load transactions');
      }
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setTxnLoading(false);
    }
  };

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const customerWallets = wallets.filter((w) => w.ownerType === 'CUSTOMER');
  const sellerWallets = wallets.filter((w) => w.ownerType === 'SELLER');

  const filteredWallets = searchQuery
    ? wallets.filter(
        (w) =>
          w.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : wallets;

  return (
    <>
      <DashboardHeader title="Wallets" />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Wallets"
            value={wallets.length}
            icon={Wallet}
            loading={loading}
            href="/wallets"
          />
          <StatCard
            label="Total Balance"
            value={fmtMoney(totalBalance)}
            icon={Wallet}
            loading={loading}
            href="/revenue"
          />
          <StatCard
            label="Customer Wallets"
            value={customerWallets.length}
            icon={Wallet}
            loading={loading}
            href="/wallets?ownerType=CUSTOMER"
          />
          <StatCard
            label="Seller Wallets"
            value={sellerWallets.length}
            icon={Wallet}
            loading={loading}
            href="/wallets?ownerType=SELLER"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3"
        >
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 flex-1 min-w-[200px] max-w-md">
            <Search size={18} className="text-text-muted shrink-0" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {OWNER_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setOwnerFilterAndUrl(f.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  ownerFilter === f.key
                    ? 'border-primary-500 bg-primary-500 text-white'
                    : 'border-border bg-surface text-text-secondary hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setLoading(true); fetchWallets(); }}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary hover:bg-surface-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </motion.div>

        <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-text-muted">Owner</th>
                  <th className="text-left py-3 px-4 font-medium text-text-muted">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-text-muted">Balance</th>
                  <th className="text-left py-3 px-4 font-medium text-text-muted">Last activity</th>
                  <th className="text-right py-3 px-4 font-medium text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i} className="border-b border-border-light">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <td key={j} className="py-3 px-4">
                          <div className="h-4 w-3/4 max-w-[120px] rounded bg-surface-muted animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredWallets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-muted">
                      No wallets found
                    </td>
                  </tr>
                ) : (
                  filteredWallets.map((wallet) => (
                    <tr key={wallet.id} className="border-b border-border-light hover:bg-surface-muted/50">
                      <td className="py-3 px-4">
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary truncate">{wallet.ownerName}</p>
                          <p className="text-xs text-text-muted truncate">{wallet.ownerEmail}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={ownerBadgeVariant(wallet.ownerType)}>
                          {wallet.ownerType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${wallet.balance >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                          {fmtMoney(wallet.balance)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {wallet.transactions[0] ? (
                          <div className="min-w-0 max-w-[260px]">
                            <p className="text-sm text-text-primary truncate" title={wallet.transactions[0].description}>
                              <Badge variant={txnBadgeVariant(wallet.transactions[0].type)} className="mr-1.5">
                                {wallet.transactions[0].type}
                              </Badge>
                              {fmtMoney(wallet.transactions[0].amount)}
                            </p>
                            <p className="text-xs text-text-muted truncate">
                              {wallet.transactions[0].description} · {new Date(wallet.transactions[0].createdAt).toLocaleString()}
                            </p>
                          </div>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => void openTransactions(wallet)}
                            className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors"
                            title="View all transactions"
                          >
                            <ListOrdered size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setActionModal({ type: 'credit', wallet });
                              setActionAmount('');
                              setActionDescription('');
                            }}
                            className="p-1.5 rounded-lg hover:bg-success-50 text-success-600 transition-colors"
                            title="Credit"
                          >
                            <ArrowUpCircle size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setActionModal({ type: 'debit', wallet });
                              setActionAmount('');
                              setActionDescription('');
                            }}
                            className="p-1.5 rounded-lg hover:bg-danger-50 text-danger-600 transition-colors"
                            title="Debit"
                          >
                            <ArrowDownCircle size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-text-muted">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Credit/Debit Modal */}
      <AnimatePresence>
        {actionModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setActionModal(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-surface rounded-2xl border border-border shadow-elevated w-full max-w-md"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-base font-semibold text-text-primary font-display">
                  {actionModal.type === 'credit' ? 'Credit' : 'Debit'} Wallet
                </h2>
                <button onClick={() => setActionModal(null)} className="p-1 rounded-lg hover:bg-surface-muted text-text-muted">
                  <X size={18} />
                </button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="rounded-xl bg-surface-muted p-3">
                  <p className="text-sm font-medium text-text-primary">{actionModal.wallet.ownerName}</p>
                  <p className="text-xs text-text-muted">{actionModal.wallet.ownerEmail}</p>
                  <p className="text-sm font-semibold text-text-primary mt-1">
                    Balance: {fmtMoney(actionModal.wallet.balance)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Amount (₹)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={actionAmount}
                    onChange={(e) => setActionAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Description</label>
                  <textarea
                    value={actionDescription}
                    onChange={(e) => setActionDescription(e.target.value)}
                    placeholder="Reason for this transaction..."
                    rows={3}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors min-h-[80px]"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                <Button variant="ghost" size="sm" onClick={() => setActionModal(null)} disabled={actionLoading}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAction}
                  loading={actionLoading}
                  className={actionModal.type === 'debit' ? 'bg-danger-500 hover:bg-danger-600' : ''}
                >
                  {actionModal.type === 'credit' ? (
                    <><ArrowUpCircle size={14} /> Credit</>
                  ) : (
                    <><ArrowDownCircle size={14} /> Debit</>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transactions Modal */}
      <AnimatePresence>
        {txnModalWallet && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setTxnModalWallet(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-surface rounded-2xl border border-border shadow-elevated w-full max-w-3xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                  <h2 className="text-base font-semibold text-text-primary font-display">
                    Transactions — {txnModalWallet.ownerName}
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    {txnModalWallet.ownerEmail} · Balance {fmtMoney(txnModalWallet.balance)}
                  </p>
                </div>
                <button
                  onClick={() => setTxnModalWallet(null)}
                  className="p-1 rounded-lg hover:bg-surface-muted text-text-muted"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-auto px-2 py-2">
                {txnLoading ? (
                  <div className="flex items-center justify-center py-12 text-text-muted">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                  </div>
                ) : txnList.length === 0 ? (
                  <p className="py-12 text-center text-sm text-text-muted">
                    No transactions on this wallet yet.
                  </p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-surface-muted/50 text-text-muted sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">When</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-left">Reference</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2 text-right">Balance after</th>
                        <th className="px-3 py-2 text-left">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txnList.map((t) => (
                        <tr key={t.id} className="border-t border-border align-top">
                          <td className="px-3 py-2 text-text-secondary whitespace-nowrap">
                            {new Date(t.createdAt).toLocaleString()}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={txnBadgeVariant(t.type)}>{t.type}</Badge>
                          </td>
                          <td className="px-3 py-2 text-text-muted">
                            {t.referenceType ?? '—'}
                            {t.referenceId && (
                              <span className="block text-[10px] truncate max-w-[160px]" title={t.referenceId}>
                                {t.referenceId}
                              </span>
                            )}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${
                              txnBadgeVariant(t.type) === 'success'
                                ? 'text-success-600'
                                : txnBadgeVariant(t.type) === 'danger'
                                  ? 'text-danger-600'
                                  : 'text-text-primary'
                            }`}
                          >
                            {fmtMoney(t.amount)}
                          </td>
                          <td className="px-3 py-2 text-right text-text-secondary whitespace-nowrap">
                            {t.balanceAfter != null ? fmtMoney(t.balanceAfter) : '—'}
                          </td>
                          <td className="px-3 py-2 text-text-secondary">{t.description ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
