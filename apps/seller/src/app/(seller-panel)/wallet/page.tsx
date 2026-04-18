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
  CheckCircle2,
  AlertCircle,
  Building2,
  Percent,
  Clock,
  ShieldCheck,
  Banknote,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Badge } from '@xelnova/ui';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StatCard } from '@/components/dashboard/stat-card';
import {
  apiGetWalletBalance,
  apiGetWalletTransactions,
  apiGetBankDetails,
  apiRequestManualPayout,
  apiRequestAdvancePayout,
  type BankDetails,
} from '@/lib/api';

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

type PayoutType = 'manual' | 'advance' | null;

const ADVANCE_PERCENTAGES = [10, 20, 30, 40, 50];

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const [payoutType, setPayoutType] = useState<PayoutType>(null);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [bankLoading, setBankLoading] = useState(false);

  const [payoutAmount, setPayoutAmount] = useState('');
  const [advancePercentage, setAdvancePercentage] = useState(10);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [payoutNotes, setPayoutNotes] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState<{
    message: string;
    bankDetails: { accountNumber: string; bankName: string | null };
  } | null>(null);

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

  const openPayoutModal = async (type: PayoutType) => {
    setPayoutType(type);
    setPayoutAmount('');
    setAdvancePercentage(10);
    setAcceptedTerms(false);
    setPayoutNotes('');
    setPayoutSuccess(null);
    setBankLoading(true);

    try {
      const details = await apiGetBankDetails();
      setBankDetails(details);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load bank details');
      setPayoutType(null);
    } finally {
      setBankLoading(false);
    }
  };

  const closePayoutModal = () => {
    if (!payoutLoading) {
      setPayoutType(null);
      setPayoutSuccess(null);
      setBankDetails(null);
    }
  };

  const handleManualPayout = async () => {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amount > balance) {
      toast.error('Insufficient balance');
      return;
    }
    if (amount < 100) {
      toast.error('Minimum payout amount is ₹100');
      return;
    }
    if (!acceptedTerms) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    setPayoutLoading(true);
    try {
      const result = await apiRequestManualPayout(amount, acceptedTerms, payoutNotes || undefined);
      setPayoutSuccess({
        message: result.message,
        bankDetails: result.bankDetails,
      });
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Payout request failed');
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleAdvancePayout = async () => {
    if (!acceptedTerms) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    const calculatedAmount = Math.floor((balance * advancePercentage) / 100);
    if (calculatedAmount < 100) {
      toast.error('Calculated payout amount is less than minimum ₹100');
      return;
    }

    setPayoutLoading(true);
    try {
      const result = await apiRequestAdvancePayout(advancePercentage, acceptedTerms, payoutNotes || undefined);
      setPayoutSuccess({
        message: result.message,
        bankDetails: result.bankDetails,
      });
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Payout request failed');
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

  const advanceAmount = Math.floor((balance * advancePercentage) / 100);

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
            href="/payouts"
          />
          <StatCard
            label="Total Credits"
            value={`₹${creditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            icon={ArrowUpCircle}
            loading={loading}
            href="/wallet?type=CREDIT"
          />
          <StatCard
            label="Total Debits"
            value={`₹${debitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            icon={ArrowDownCircle}
            loading={loading}
            href="/wallet?type=DEBIT"
          />
        </div>

        {/* Payout Options */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <button
            onClick={() => openPayoutModal('manual')}
            disabled={balance < 100}
            className="group relative flex flex-col items-start gap-3 p-5 rounded-2xl border border-border bg-surface hover:border-primary-300 hover:bg-primary-50/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary-100 text-primary-600 group-hover:bg-primary-200 transition-colors">
              <Banknote className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Manual Payout</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Withdraw your full available balance or custom amount to your verified bank account
              </p>
            </div>
            <div className="absolute top-4 right-4">
              <Send className="h-4 w-4 text-text-muted group-hover:text-primary-500 transition-colors" />
            </div>
          </button>

          <button
            onClick={() => openPayoutModal('advance')}
            disabled={balance < 100}
            className="group relative flex flex-col items-start gap-3 p-5 rounded-2xl border border-border bg-surface hover:border-amber-300 hover:bg-amber-50/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-amber-100 text-amber-600 group-hover:bg-amber-200 transition-colors">
              <Percent className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Advance Payout</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Get 10-50% of your available balance as advance payout
              </p>
            </div>
            <div className="absolute top-4 right-4">
              <Clock className="h-4 w-4 text-text-muted group-hover:text-amber-500 transition-colors" />
            </div>
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <h2 className="text-lg font-semibold text-text-primary font-display">Transaction History</h2>
          <button
            onClick={() => { setLoading(true); loadData(); }}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary hover:bg-surface-muted transition-colors"
          >
            <RefreshCw size={16} />
          </button>
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
        {payoutType && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            onClick={(e) => { if (e.target === e.currentTarget) closePayoutModal(); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-surface rounded-2xl border border-border shadow-elevated w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
                <div className="flex items-center gap-3">
                  {payoutType === 'manual' ? (
                    <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary-100 text-primary-600">
                      <Banknote className="h-5 w-5" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-amber-100 text-amber-600">
                      <Percent className="h-5 w-5" />
                    </div>
                  )}
                  <h2 className="text-base font-semibold text-text-primary font-display">
                    {payoutType === 'manual' ? 'Manual Payout' : 'Advance Payout'}
                  </h2>
                </div>
                <button onClick={closePayoutModal} className="p-1 rounded-lg hover:bg-surface-muted text-text-muted">
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-5">
                {bankLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                    <p className="text-sm text-text-muted">Loading bank details...</p>
                  </div>
                ) : payoutSuccess ? (
                  <div className="flex flex-col items-center text-center py-6 gap-4">
                    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-success-100">
                      <CheckCircle2 className="h-8 w-8 text-success-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">Payout Request Submitted</h3>
                      <p className="text-sm text-text-muted mt-2 max-w-sm">
                        {payoutSuccess.message}
                      </p>
                    </div>
                    <div className="rounded-xl bg-surface-muted p-4 w-full mt-2">
                      <p className="text-xs text-text-muted mb-2">Transfer to:</p>
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-text-muted" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-text-primary">
                            {payoutSuccess.bankDetails.bankName || 'Bank Account'}
                          </p>
                          <p className="text-xs text-text-muted">
                            A/C: {payoutSuccess.bankDetails.accountNumber}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-medium">Transfer within 72 hours</span>
                    </div>
                  </div>
                ) : !bankDetails?.bankVerified ? (
                  <div className="flex flex-col items-center text-center py-6 gap-4">
                    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-danger-100">
                      <AlertCircle className="h-8 w-8 text-danger-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">Bank Account Not Verified</h3>
                      <p className="text-sm text-text-muted mt-2">
                        Please verify your bank account details before requesting a payout. Go to your profile settings to complete bank verification.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Balance Card */}
                    <div className="rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 p-4 text-white">
                      <p className="text-sm opacity-80">Available Balance</p>
                      <p className="text-2xl font-bold">
                        ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Bank Details */}
                    <div className="rounded-xl border border-border bg-surface-muted/50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck className="h-4 w-4 text-success-500" />
                        <span className="text-xs font-semibold text-success-600">Verified Bank Account</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-surface">
                          <Building2 className="h-5 w-5 text-text-muted" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {bankDetails.bankName || 'Bank Account'}
                          </p>
                          <p className="text-xs text-text-muted">
                            {bankDetails.bankVerifiedName} • A/C: ***{bankDetails.bankAccountNumber?.slice(-4)}
                          </p>
                          <p className="text-xs text-text-muted">
                            IFSC: {bankDetails.bankIfscCode}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Manual Payout Form */}
                    {payoutType === 'manual' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1.5">
                            Payout Amount (₹)
                          </label>
                          <input
                            type="number"
                            min="100"
                            step="1"
                            max={balance}
                            value={payoutAmount}
                            onChange={(e) => setPayoutAmount(e.target.value)}
                            placeholder="Enter amount (min ₹100)"
                            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors"
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => setPayoutAmount(String(balance))}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-surface-muted transition-colors"
                            >
                              Full Balance
                            </button>
                            <button
                              type="button"
                              onClick={() => setPayoutAmount(String(Math.floor(balance / 2)))}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-surface-muted transition-colors"
                            >
                              50%
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1.5">
                            Notes (optional)
                          </label>
                          <textarea
                            value={payoutNotes}
                            onChange={(e) => setPayoutNotes(e.target.value)}
                            placeholder="Any notes for this payout..."
                            rows={2}
                            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Advance Payout Form */}
                    {payoutType === 'advance' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Select Advance Percentage
                          </label>
                          <div className="grid grid-cols-5 gap-2">
                            {ADVANCE_PERCENTAGES.map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => setAdvancePercentage(pct)}
                                className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                  advancePercentage === pct
                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                                    : 'bg-surface-muted text-text-primary hover:bg-amber-100 border border-border'
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-amber-800">You will receive</span>
                            <span className="text-xl font-bold text-amber-900">
                              ₹{advanceAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <p className="text-xs text-amber-600 mt-1">
                            {advancePercentage}% of ₹{balance.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1.5">
                            Notes (optional)
                          </label>
                          <textarea
                            value={payoutNotes}
                            onChange={(e) => setPayoutNotes(e.target.value)}
                            placeholder="Any notes for this payout..."
                            rows={2}
                            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-colors resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Terms & Conditions */}
                    <div className="rounded-xl border border-border bg-surface-muted/30 p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                        Terms & Conditions
                      </h4>
                      <ul className="text-xs text-text-muted space-y-1.5">
                        <li className="flex items-start gap-2">
                          <span className="text-primary-500 mt-0.5">•</span>
                          Payout will be processed and transferred to your verified bank account within 72 hours.
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary-500 mt-0.5">•</span>
                          Once submitted, payout requests cannot be cancelled or modified.
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary-500 mt-0.5">•</span>
                          Ensure your bank details are correct. Incorrect details may cause delays.
                        </li>
                        {payoutType === 'advance' && (
                          <li className="flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5">•</span>
                            Advance payouts are limited to 10-50% of your available balance.
                          </li>
                        )}
                      </ul>
                      <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-border">
                        <input
                          type="checkbox"
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-xs text-text-primary">
                          I have read and agree to the terms and conditions. I confirm that the bank account details shown above are correct.
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              {!bankLoading && !payoutSuccess && bankDetails?.bankVerified && (
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border sticky bottom-0 bg-surface">
                  <Button variant="ghost" size="sm" onClick={closePayoutModal} disabled={payoutLoading}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={payoutType === 'manual' ? handleManualPayout : handleAdvancePayout}
                    disabled={payoutLoading || !acceptedTerms || (payoutType === 'manual' && (!payoutAmount || parseFloat(payoutAmount) < 100)) || (payoutType === 'advance' && advanceAmount < 100)}
                    className={payoutType === 'advance' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                  >
                    {payoutLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send size={14} />
                        {payoutType === 'manual'
                          ? `Request ₹${payoutAmount ? parseFloat(payoutAmount).toLocaleString('en-IN') : '0'}`
                          : `Request ₹${advanceAmount.toLocaleString('en-IN')}`}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {payoutSuccess && (
                <div className="flex items-center justify-center px-6 py-4 border-t border-border">
                  <Button size="sm" onClick={closePayoutModal}>
                    Done
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
