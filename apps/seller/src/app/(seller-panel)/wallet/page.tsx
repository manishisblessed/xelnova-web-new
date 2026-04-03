'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Send,
  RefreshCw,
  Loader2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Badge } from '@xelnova/ui';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { apiGetWalletBalance, apiGetWalletTransactions, apiRequestPayout } from '@/lib/api';

interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType: string;
  referenceId?: string;
  createdAt: string;
}

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [balanceRes, txRes] = await Promise.all([
        apiGetWalletBalance(),
        apiGetWalletTransactions(pagination.page, pagination.limit),
      ]);
      setBalance((balanceRes as any).balance || 0);
      setTransactions((txRes as any).transactions || []);
      if ((txRes as any).balance !== undefined) setBalance((txRes as any).balance);
      if ((txRes as any).pagination) {
        setPagination((prev) => ({ ...prev, ...(txRes as any).pagination }));
      }
    } catch {
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePayout = async () => {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amount > balance) {
      toast.error('Insufficient balance');
      return;
    }

    setPayoutLoading(true);
    try {
      await apiRequestPayout(amount, payoutNotes || undefined);
      toast.success('Payout request submitted');
      setPayoutOpen(false);
      setPayoutAmount('');
      setPayoutNotes('');
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Payout failed');
    } finally {
      setPayoutLoading(false);
    }
  };

  const creditTotal = transactions
    .filter((t) => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0);
  const debitTotal = transactions
    .filter((t) => t.type === 'DEBIT')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <>
      <DashboardHeader title="Wallet" />

      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Available Balance"
            value={`₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            icon={Wallet}
            loading={loading}
          />
          <StatCard
            label="Total Credits"
            value={`₹${creditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            icon={ArrowUpCircle}
            loading={loading}
          />
          <StatCard
            label="Total Debits"
            value={`₹${debitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            icon={ArrowDownCircle}
            loading={loading}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <h2 className="text-lg font-semibold text-text-primary font-display">Transaction History</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setLoading(true); loadData(); }}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary hover:bg-surface-muted transition-colors"
            >
              <RefreshCw size={16} />
            </button>
            <Button
              size="sm"
              onClick={() => {
                setPayoutOpen(true);
                setPayoutAmount('');
                setPayoutNotes('');
              }}
              disabled={balance <= 0}
            >
              <Send size={14} />
              Request Payout
            </Button>
          </div>
        </motion.div>

        <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-text-muted">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-text-muted">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-text-muted">Description</th>
                  <th className="text-left py-3 px-4 font-medium text-text-muted">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-text-muted">Balance After</th>
                  <th className="text-left py-3 px-4 font-medium text-text-muted">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i} className="border-b border-border-light">
                      {[1, 2, 3, 4, 5, 6].map((j) => (
                        <td key={j} className="py-3 px-4">
                          <div className="h-4 w-3/4 max-w-[120px] rounded bg-surface-muted animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">
                      No transactions yet
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border-light hover:bg-surface-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {tx.type === 'CREDIT' ? (
                            <ArrowUpCircle size={16} className="text-success-500" />
                          ) : (
                            <ArrowDownCircle size={16} className="text-danger-500" />
                          )}
                          <span className={`font-medium ${tx.type === 'CREDIT' ? 'text-success-600' : 'text-danger-600'}`}>
                            {tx.type}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${tx.type === 'CREDIT' ? 'text-success-600' : 'text-danger-600'}`}>
                          {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-text-primary truncate max-w-[200px]">{tx.description}</p>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="default">
                          {tx.referenceType.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium text-text-primary">
                        ₹{tx.balanceAfter.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-text-muted">
                        {new Date(tx.createdAt).toLocaleDateString()}
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

      {/* Payout Modal */}
      <AnimatePresence>
        {payoutOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setPayoutOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-surface rounded-2xl border border-border shadow-elevated w-full max-w-md"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-base font-semibold text-text-primary font-display">Request Payout</h2>
                <button onClick={() => setPayoutOpen(false)} className="p-1 rounded-lg hover:bg-surface-muted text-text-muted">
                  <X size={18} />
                </button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="rounded-xl bg-surface-muted p-3">
                  <p className="text-sm text-text-muted">Available Balance</p>
                  <p className="text-xl font-bold text-text-primary">
                    ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    max={balance}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Enter payout amount"
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Notes (optional)</label>
                  <textarea
                    value={payoutNotes}
                    onChange={(e) => setPayoutNotes(e.target.value)}
                    placeholder="Any notes for this payout..."
                    rows={2}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
                  />
                </div>
                <p className="text-xs text-text-muted">
                  The payout will be transferred to your registered bank account.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                <Button variant="ghost" size="sm" onClick={() => setPayoutOpen(false)} disabled={payoutLoading}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handlePayout} loading={payoutLoading}>
                  <Send size={14} />
                  Submit Payout
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
