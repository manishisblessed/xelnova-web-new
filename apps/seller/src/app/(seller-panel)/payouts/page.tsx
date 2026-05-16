'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IndianRupee, Wallet, Percent, ShoppingCart, Package, Truck,
  TrendingUp, Calendar, Send, X, Loader2, Building2, ShieldCheck,
  CheckCircle, CheckCircle2, Clock, AlertCircle, Banknote, PiggyBank,
} from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
const ChartCard = dynamic(() => import('@/components/dashboard/chart-card').then((m) => m.ChartCard), { ssr: false, loading: () => <div className="rounded-2xl border border-border bg-surface p-6 shadow-card h-[280px] flex items-center justify-center"><div className="w-full h-full max-w-[400px] rounded-xl bg-surface-muted animate-pulse" /></div> });
import { Badge, Button } from '@xelnova/ui';
import {
  apiGetRevenue, apiGetOrders, apiGetWalletBalance, apiGetBankDetails,
  apiRequestManualPayout, apiRequestAdvancePayout, apiGetPayoutHistory,
  apiGetHeldPayouts,
  type BankDetails, type PayoutHistoryItem, type HeldPayoutItem,
} from '@/lib/api';

interface RevenueResponse {
  totalRevenue: number;
  netRevenue: number;
  commission: number;
  commissionRate: number;
  courierDeduction?: number;
  xelgoServiceFee?: number;
  returnDeduction?: number;
  totalOrders: number;
  totalUnits?: number;
  dailyRevenue: { date: string; amount: number }[];
}

interface SimpleOrder {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: { price: number; quantity: number }[];
}

function fmt(n: number) {
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDec(n: number) {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function normalizeOrders(res: unknown): SimpleOrder[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object' && 'items' in res) return (res as { items: SimpleOrder[] }).items;
  return [];
}

type PayoutCycle = {
  id: string;
  period: string;
  grossSales: number;
  commission: number;
  netPayout: number;
  orders: number;
  status: 'paid' | 'processing' | 'upcoming';
  date: string;
};

type PayoutModalType = 'manual' | 'advance' | null;

const ADVANCE_PERCENTAGES = [10, 20, 30, 40, 50];

export default function SellerPayoutsPage() {
  const [data, setData] = useState<RevenueResponse | null>(null);
  const [orders, setOrders] = useState<SimpleOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Wallet balance for payout
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);

  // Payout history
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Held payouts (delivered but inside the 7-business-day hold window)
  const [heldPayouts, setHeldPayouts] = useState<HeldPayoutItem[]>([]);
  const [heldTotal, setHeldTotal] = useState(0);

  // Payout modal state
  const [payoutModal, setPayoutModal] = useState<PayoutModalType>(null);
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

  const loadPayoutHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await apiGetPayoutHistory(1, 20) as { payouts: PayoutHistoryItem[] };
      setPayoutHistory(res.payouts || []);
    } catch { /* ignore */ }
    finally { setHistoryLoading(false); }
  }, []);

  const loadHeldPayouts = useCallback(async () => {
    try {
      const res = await apiGetHeldPayouts();
      setHeldPayouts(res.payouts || []);
      setHeldTotal(res.totalHeld || 0);
    } catch { /* held payouts are an enhancement; failures shouldn't break the page */ }
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([apiGetRevenue(), apiGetOrders(), apiGetWalletBalance()])
      .then(([rev, ord, bal]) => {
        if (cancelled) return;
        setData(rev as RevenueResponse);
        setOrders(normalizeOrders(ord));
        setWalletBalance((bal as { balance: number }).balance ?? 0);
      })
      .catch((err: Error) => toast.error(err.message || 'Failed to load payout data'))
      .finally(() => { if (!cancelled) { setLoading(false); setWalletLoading(false); } });

    loadPayoutHistory();
    loadHeldPayouts();
    return () => { cancelled = true; };
  }, [loadPayoutHistory, loadHeldPayouts]);

  const chartData = data?.dailyRevenue?.map((d) => ({ name: d.date.slice(5), value: d.amount })) ?? [];

  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');
  const pendingSettlement = orders.filter((o) => ['SHIPPED', 'PROCESSING', 'CONFIRMED'].includes(o.status));
  const deliveredTotal = deliveredOrders.reduce((s, o) => s + o.total, 0);
  const pendingTotal = pendingSettlement.reduce((s, o) => s + o.total, 0);

  const commRate = data?.commissionRate ?? 0;
  const deliveredNet = deliveredTotal - (deliveredTotal * commRate / 100);
  const inTransitNet = pendingTotal - (pendingTotal * commRate / 100);
  // Combined "pending settlement" = in-transit (not yet delivered) + delivered-but-held
  // (delivered, inside the 7-business-day hold window). The held bucket is authoritative
  // because it comes from snapshotted Payout rows on the server.
  const pendingNet = inTransitNet + heldTotal;
  const earliestUnlock = heldPayouts
    .map((p) => p.holdUntil)
    .filter((d): d is string => !!d)
    .sort()[0];
  const payoutCycles: PayoutCycle[] = buildPayoutCycles(deliveredOrders, commRate);
  const advanceAmount = Math.floor((walletBalance * advancePercentage) / 100);
  const xelgoFeeAmount = data?.xelgoServiceFee ?? 0;
  const returnDeductionAmount = data?.returnDeduction ?? 0;

  // ─── Payout modal handlers ───

  const openPayoutModal = async (type: PayoutModalType) => {
    setPayoutModal(type);
    setPayoutAmount('');
    setAdvancePercentage(10);
    setAcceptedTerms(false);
    setPayoutNotes('');
    setPayoutSuccess(null);
    setBankLoading(true);
    try {
      setBankDetails(await apiGetBankDetails());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load bank details');
      setPayoutModal(null);
    } finally { setBankLoading(false); }
  };

  const closePayoutModal = () => {
    if (!payoutLoading) { setPayoutModal(null); setPayoutSuccess(null); setBankDetails(null); }
  };

  const handleManualPayout = async () => {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (amount > walletBalance) { toast.error('Insufficient balance'); return; }
    if (amount < 100) { toast.error('Minimum payout amount is ₹100'); return; }
    if (!acceptedTerms) { toast.error('Please accept the terms and conditions'); return; }
    setPayoutLoading(true);
    try {
      const result = await apiRequestManualPayout(amount, acceptedTerms, payoutNotes || undefined);
      setPayoutSuccess({ message: result.message, bankDetails: result.bankDetails });
      setWalletBalance(result.newBalance);
      loadPayoutHistory();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Payout request failed'); }
    finally { setPayoutLoading(false); }
  };

  const handleAdvancePayout = async () => {
    if (!acceptedTerms) { toast.error('Please accept the terms and conditions'); return; }
    if (advanceAmount < 100) { toast.error('Calculated payout amount is less than minimum ₹100'); return; }
    setPayoutLoading(true);
    try {
      const result = await apiRequestAdvancePayout(advancePercentage, acceptedTerms, payoutNotes || undefined);
      setPayoutSuccess({ message: result.message, bankDetails: result.bankDetails });
      setWalletBalance(result.newBalance);
      loadPayoutHistory();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Payout request failed'); }
    finally { setPayoutLoading(false); }
  };

  return (
    <>
      <DashboardHeader title="Payouts & Settlements" />
      <div className="p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Link
              href="/wallet"
              aria-label="Open wallet"
              className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
            >
              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-text-muted">Available Balance</p>
                    <p className={`text-3xl font-bold mt-1 ${walletBalance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {walletLoading ? '—' : fmtDec(walletBalance)}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      {walletBalance < 0
                        ? 'Adjusted after returns — next settlement will offset'
                        : earliestUnlock && walletBalance < 100
                          ? `Next unlock: ${new Date(earliestUnlock).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                          : 'Ready to withdraw after 7 business days'}
                    </p>
                  </div>
                  <div className={`rounded-xl p-2.5 ${walletBalance < 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                    <Wallet size={20} className={walletBalance < 0 ? 'text-red-600' : 'text-emerald-600'} />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
            <Link
              href="/orders?tab=in_transit"
              aria-label="Open in-transit and held orders"
              className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
              title={[
                `${pendingSettlement.length} in-transit · ${fmt(inTransitNet)}`,
                `${heldPayouts.length} delivered (7-day hold) · ${fmt(heldTotal)}`,
                earliestUnlock ? `Next unlock: ${new Date(earliestUnlock).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : '',
              ].filter(Boolean).join('\n')}
            >
              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-text-muted">Pending Settlement</p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">{loading ? '—' : fmt(pendingNet)}</p>
                    <p className="text-xs text-text-muted mt-1 truncate">
                      {pendingSettlement.length} in-transit + {heldPayouts.length} on hold
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-2.5"><Clock size={20} className="text-amber-600" /></div>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
            <Link href="/settlement" aria-label="View total earnings" className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40">
              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-text-muted">Total Earnings</p>
                    <p className="text-3xl font-bold text-text-primary mt-1">{loading ? '—' : fmt(data?.netRevenue ?? 0)}</p>
                    <p className="text-xs text-text-muted mt-1">Gross − Commission − Courier − ₹30 Xelgo fee</p>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-2.5"><IndianRupee size={20} className="text-blue-600" /></div>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
            <Link href="/orders?tab=delivered" aria-label="View commission details" className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40">
              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-text-muted">Platform Commission</p>
                    <p className="text-3xl font-bold text-red-500 mt-1">{loading ? '—' : fmt(data?.commission ?? 0)}</p>
                    <p className="text-xs text-text-muted mt-1">
                      {commRate > 0 ? `Effective ${commRate.toFixed(2)}% across this period` : 'Set per product when admin approves'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-red-50 p-2.5"><Percent size={20} className="text-red-500" /></div>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Link href="/shipping" aria-label="View courier charges" className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40">
              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-text-muted">Courier Charges</p>
                    <p className="text-3xl font-bold text-orange-500 mt-1">{loading ? '—' : fmt(data?.courierDeduction ?? 0)}</p>
                    <p className="text-xs text-text-muted mt-1">Xelgo carrier rate (debited at booking)</p>
                  </div>
                  <div className="rounded-xl bg-orange-50 p-2.5"><Truck size={20} className="text-orange-500" /></div>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Link href="/settlement" aria-label="View Xelgo service fee details" className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40">
              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-text-muted">Xelgo Service Fee</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{loading ? '—' : fmt(xelgoFeeAmount)}</p>
                    <p className="text-xs text-text-muted mt-1">₹30 flat per Xelgo shipment</p>
                  </div>
                  <div className="rounded-xl bg-purple-50 p-2.5"><Banknote size={20} className="text-purple-600" /></div>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Return deductions banner (only when there are any) */}
        {returnDeductionAmount > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <AlertCircle size={18} />
            </div>
            <div className="flex-1 text-sm">
              <span className="font-semibold text-red-700">Return deductions: {fmt(returnDeductionAmount)}</span>
              <span className="text-text-muted ml-2">Return courier + ₹30 Xelgo fee for returned orders.</span>
            </div>
          </motion.div>
        )}

        {/* Held cycles strip — visible only when there are payouts waiting to release */}
        {heldPayouts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4"
          >
            <div className="flex items-start justify-between mb-3 gap-2">
              <div>
                <p className="text-sm font-bold text-amber-700 flex items-center gap-1.5"><Clock size={14} />Settlements on 7-day hold</p>
                <p className="text-xs text-amber-700/80 mt-0.5">Funds unlock automatically the 7th business day after delivery (skipping Sundays + holidays).</p>
              </div>
              <p className="text-sm font-semibold text-amber-700 whitespace-nowrap">{fmtDec(heldTotal)}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {heldPayouts.slice(0, 6).map((p) => (
                <div key={p.id} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-text-primary truncate">{p.orderNumber || p.orderId?.slice(0, 8) || '—'}</span>
                    <span className="font-semibold text-emerald-600">{fmtDec(p.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5 text-text-muted">
                    <span>Gross {fmt(p.gross ?? 0)}</span>
                    <span>Unlocks {p.holdUntil ? new Date(p.holdUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</span>
                  </div>
                </div>
              ))}
            </div>
            {heldPayouts.length > 6 && (
              <p className="text-[11px] text-amber-700/80 mt-2">+ {heldPayouts.length - 6} more held settlements</p>
            )}
          </motion.div>
        )}

        {/* ─── Request Payout Section ─── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <div className="rounded-2xl border border-border bg-gradient-to-br from-white to-emerald-50/30 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Request Payout</h3>
                <p className="text-xs text-text-muted mt-0.5">Transfer funds to your verified bank account via Axis Bank / Cashfree / PayU</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted">Wallet Balance</p>
                <p className="text-lg font-bold text-emerald-600">{walletLoading ? '—' : fmtDec(walletBalance)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => openPayoutModal('manual')}
                disabled={walletBalance < 100}
                className="group relative flex items-start gap-4 p-4 rounded-xl border border-border bg-white hover:border-primary-300 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <div className="flex-shrink-0 flex items-center justify-center h-11 w-11 rounded-xl bg-primary-100 text-primary-600 group-hover:bg-primary-200 transition-colors">
                  <Banknote className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-text-primary">Full / Custom Payout</h4>
                  <p className="text-xs text-text-muted mt-0.5">Withdraw any amount from your balance (min ₹100)</p>
                </div>
                <Send className="absolute top-4 right-4 h-4 w-4 text-text-muted group-hover:text-primary-500 transition-colors" />
              </button>

              <button
                onClick={() => openPayoutModal('advance')}
                disabled={walletBalance < 100}
                className="group relative flex items-start gap-4 p-4 rounded-xl border border-border bg-white hover:border-amber-300 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <div className="flex-shrink-0 flex items-center justify-center h-11 w-11 rounded-xl bg-amber-100 text-amber-600 group-hover:bg-amber-200 transition-colors">
                  <Percent className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-text-primary">Advance Payout (10–50%)</h4>
                  <p className="text-xs text-text-muted mt-0.5">Get a partial advance of up to 50% of your available balance</p>
                </div>
                <Clock className="absolute top-4 right-4 h-4 w-4 text-text-muted group-hover:text-amber-500 transition-colors" />
              </button>
            </div>

            {walletBalance < 100 && !walletLoading && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-3 text-center">
                Minimum balance of ₹100 required to request a payout. Current balance: {fmtDec(walletBalance)}
              </p>
            )}
          </div>
        </motion.div>

        {/* ─── Payout History ─── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
          className="rounded-2xl border border-border bg-white shadow-sm"
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary">Payout History</h3>
            <Badge variant="default">{payoutHistory.length} requests</Badge>
          </div>
          {historyLoading ? (
            <div className="p-5 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}</div>
          ) : payoutHistory.length === 0 ? (
            <div className="py-10 text-center">
              <Banknote size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-text-muted text-sm">No payout requests yet</p>
              <p className="text-text-muted text-xs mt-1">Use the buttons above to request your first payout</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">Date</th>
                    <th className="px-4 py-2.5 text-right font-medium text-gray-600">Amount</th>
                    <th className="px-4 py-2.5 text-center font-medium text-gray-600">Type</th>
                    <th className="px-4 py-2.5 text-center font-medium text-gray-600">Status</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutHistory.map((p) => (
                    <tr key={p.id} className="border-t border-border hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {new Date(p.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {p.paidAt && (
                          <span className="block text-[10px] text-text-muted">
                            Paid {new Date(p.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-text-primary">{fmtDec(p.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={p.isAdvance ? 'warning' : 'default'} className="text-[10px]">
                          {p.isAdvance ? 'Advance' : 'Manual'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={p.status === 'PAID' || p.status === 'APPROVED' ? 'success' : p.status === 'PENDING' ? 'warning' : p.status === 'REJECTED' ? 'danger' : 'default'} className="text-[10px]">
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted truncate max-w-[180px]">{p.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Revenue chart + Breakdown */}
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartCard title="Daily Revenue Trend" data={chartData} loading={loading} />
          </div>

          {/* Earnings breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="rounded-2xl border border-border bg-white p-5 shadow-sm"
          >
            <h3 className="text-sm font-bold text-text-primary mb-4">Earnings Breakdown</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-muted">Gross Sales</span>
                  <span className="font-semibold text-text-primary">{fmt(data?.totalRevenue ?? 0)}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-muted">
                    Commission{commRate > 0 ? ` (avg ${commRate.toFixed(2)}%)` : ''}
                  </span>
                  <span className="font-semibold text-red-500">-{fmt(data?.commission ?? 0)}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(100, commRate)}%` }} />
                </div>
              </div>
              {(data?.courierDeduction ?? 0) > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-muted flex items-center gap-1.5"><Truck size={13} /> Courier Charges (Xelgo)</span>
                    <span className="font-semibold text-orange-500">-{fmt(data?.courierDeduction ?? 0)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.min(100, (data?.totalRevenue ?? 0) > 0 ? ((data?.courierDeduction ?? 0) / (data?.totalRevenue ?? 1)) * 100 : 0)}%` }} />
                  </div>
                </div>
              )}
              {xelgoFeeAmount > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-muted flex items-center gap-1.5"><Banknote size={13} /> Xelgo Service Fee (₹30 / Xelgo order)</span>
                    <span className="font-semibold text-purple-600">-{fmt(xelgoFeeAmount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-purple-400 rounded-full" style={{ width: `${Math.min(100, (data?.totalRevenue ?? 0) > 0 ? (xelgoFeeAmount / (data?.totalRevenue ?? 1)) * 100 : 0)}%` }} />
                  </div>
                </div>
              )}
              {returnDeductionAmount > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-muted flex items-center gap-1.5"><AlertCircle size={13} /> Return Deductions</span>
                    <span className="font-semibold text-red-500">-{fmt(returnDeductionAmount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(100, (data?.totalRevenue ?? 0) > 0 ? (returnDeductionAmount / (data?.totalRevenue ?? 1)) * 100 : 0)}%` }} />
                  </div>
                </div>
              )}
              <div className="pt-3 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-text-primary">Net Earnings</span>
                  <span className="font-bold text-emerald-600">{fmt(data?.netRevenue ?? 0)}</span>
                </div>
                <p className="text-[10px] text-text-muted mt-1">Net = Gross − Commission − Courier − Xelgo Service Fee − Return Deductions</p>
              </div>
              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted flex items-center gap-1.5"><ShoppingCart size={13} /> Orders</span>
                  <span className="font-medium text-text-primary">{data?.totalOrders ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted flex items-center gap-1.5"><Package size={13} /> Units sold</span>
                  <span className="font-medium text-text-primary">{data?.totalUnits ?? 0}</span>
                </div>
                {(data?.totalOrders ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted flex items-center gap-1.5"><TrendingUp size={13} /> Avg. order value</span>
                    <span className="font-medium text-text-primary">{fmt((data?.totalRevenue ?? 0) / (data?.totalOrders || 1))}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Settlement cycles */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary">Settlement History</h3>
            <div className="flex items-center gap-2 text-xs text-text-muted"><Banknote size={14} />Payouts are settled after order delivery</div>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}</div>
          ) : payoutCycles.length === 0 ? (
            <div className="py-12 text-center">
              <PiggyBank size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-text-muted text-sm">No settlement history yet</p>
              <p className="text-text-muted text-xs mt-1">Settlements appear after orders are delivered</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {payoutCycles.map((cycle) => (
                <div key={cycle.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg p-2 ${cycle.status === 'paid' ? 'bg-emerald-50' : cycle.status === 'processing' ? 'bg-amber-50' : 'bg-gray-50'}`}>
                      {cycle.status === 'paid' ? <CheckCircle size={18} className="text-emerald-600" /> : cycle.status === 'processing' ? <Clock size={18} className="text-amber-600" /> : <Calendar size={18} className="text-gray-400" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{cycle.period}</p>
                      <p className="text-xs text-text-muted">{cycle.orders} orders · {cycle.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold text-text-primary">{fmt(cycle.netPayout)}</p>
                        <p className="text-[10px] text-text-muted">Gross {fmt(cycle.grossSales)} · Comm. {fmt(cycle.commission)}</p>
                      </div>
                      <Badge variant={cycle.status === 'paid' ? 'success' : cycle.status === 'processing' ? 'warning' : 'default'}>
                        {cycle.status === 'paid' ? 'Settled' : cycle.status === 'processing' ? 'Processing' : 'Upcoming'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* How payouts work */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="rounded-2xl border border-border bg-gradient-to-r from-primary-50 to-blue-50 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-text-primary mb-3">How Payouts Work</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'Order Delivered', desc: 'Customer receives the product and delivery is confirmed', icon: Package },
              { step: '2', title: '7 Business-Day Hold', desc: 'Funds are held for the return window (Sundays + holidays excluded)', icon: Clock },
              { step: '3', title: 'Wallet Credited', desc: 'On day 7, Net = Gross − Commission − ₹30 Xelgo fee is credited to your wallet', icon: Percent },
              { step: '4', title: 'Withdraw', desc: 'Request payout to your verified bank via Axis / Cashfree / PayU', icon: Banknote },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center">{item.step}</div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─── Payout Modal ─── */}
      <AnimatePresence>
        {payoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            onClick={(e) => { if (e.target === e.currentTarget) closePayoutModal(); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center h-10 w-10 rounded-xl ${payoutModal === 'manual' ? 'bg-primary-100 text-primary-600' : 'bg-amber-100 text-amber-600'}`}>
                    {payoutModal === 'manual' ? <Banknote className="h-5 w-5" /> : <Percent className="h-5 w-5" />}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-text-primary">{payoutModal === 'manual' ? 'Request Payout' : 'Advance Payout'}</h2>
                    <p className="text-[11px] text-text-muted">via Axis Bank / Cashfree / PayU</p>
                  </div>
                </div>
                <button onClick={closePayoutModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted"><X size={18} /></button>
              </div>

              <div className="px-6 py-5">
                {bankLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                    <p className="text-sm text-text-muted">Loading bank details...</p>
                  </div>
                ) : payoutSuccess ? (
                  <div className="flex flex-col items-center text-center py-6 gap-4">
                    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">Payout Submitted</h3>
                      <p className="text-sm text-text-muted mt-2 max-w-sm">{payoutSuccess.message}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-4 w-full">
                      <p className="text-xs text-text-muted mb-2">Transfer to:</p>
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-text-muted" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-text-primary">{payoutSuccess.bankDetails.bankName || 'Bank Account'}</p>
                          <p className="text-xs text-text-muted">A/C: {payoutSuccess.bankDetails.accountNumber}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-medium">Transfer within 72 hours</span>
                    </div>
                  </div>
                ) : !bankDetails?.bankVerified ? (
                  <div className="flex flex-col items-center text-center py-6 gap-4">
                    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                      <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">Bank Account Not Verified</h3>
                      <p className="text-sm text-text-muted mt-2">Please verify your bank account in <a href="/profile" className="text-primary-600 underline font-medium">Profile Settings</a> before requesting a payout.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 p-4 text-white">
                      <p className="text-sm opacity-80">Available Balance</p>
                      <p className="text-2xl font-bold">{fmtDec(walletBalance)}</p>
                    </div>

                    <div className="rounded-xl border border-border bg-gray-50/50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-semibold text-emerald-600">Verified Bank Account</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-white"><Building2 className="h-5 w-5 text-text-muted" /></div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{bankDetails.bankName || 'Bank Account'}</p>
                          <p className="text-xs text-text-muted">{bankDetails.bankVerifiedName} • A/C: ***{bankDetails.bankAccountNumber?.slice(-4)}</p>
                          <p className="text-xs text-text-muted">IFSC: {bankDetails.bankIfscCode}</p>
                        </div>
                      </div>
                    </div>

                    {payoutModal === 'manual' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1.5">Payout Amount (₹)</label>
                          <input
                            type="number" min="100" step="1" max={walletBalance} value={payoutAmount}
                            onChange={(e) => setPayoutAmount(e.target.value)}
                            placeholder="Enter amount (min ₹100)"
                            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                          />
                          <div className="flex gap-2 mt-2">
                            <button type="button" onClick={() => setPayoutAmount(String(walletBalance))} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-gray-50">Full Balance</button>
                            <button type="button" onClick={() => setPayoutAmount(String(Math.floor(walletBalance / 2)))} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-gray-50">50%</button>
                            <button type="button" onClick={() => setPayoutAmount(String(Math.floor(walletBalance / 4)))} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-gray-50">25%</button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1.5">Notes (optional)</label>
                          <textarea value={payoutNotes} onChange={(e) => setPayoutNotes(e.target.value)} placeholder="Any notes for this payout..." rows={2}
                            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none" />
                        </div>
                      </div>
                    )}

                    {payoutModal === 'advance' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">Select Advance Percentage</label>
                          <div className="grid grid-cols-5 gap-2">
                            {ADVANCE_PERCENTAGES.map((pct) => (
                              <button key={pct} type="button" onClick={() => setAdvancePercentage(pct)}
                                className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${advancePercentage === pct ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' : 'bg-gray-50 text-text-primary hover:bg-amber-100 border border-border'}`}
                              >{pct}%</button>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-amber-800">You will receive</span>
                            <span className="text-xl font-bold text-amber-900">{fmtDec(advanceAmount)}</span>
                          </div>
                          <p className="text-xs text-amber-600 mt-1">{advancePercentage}% of {fmtDec(walletBalance)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-1.5">Notes (optional)</label>
                          <textarea value={payoutNotes} onChange={(e) => setPayoutNotes(e.target.value)} placeholder="Any notes for this payout..." rows={2}
                            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none" />
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border border-border bg-gray-50/30 p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Terms & Conditions</h4>
                      <ul className="text-xs text-text-muted space-y-1.5">
                        <li className="flex items-start gap-2"><span className="text-primary-500 mt-0.5">•</span>Payout will be processed via Axis Bank / Cashfree / PayU and transferred within 72 hours.</li>
                        <li className="flex items-start gap-2"><span className="text-primary-500 mt-0.5">•</span>Once submitted, payout requests cannot be cancelled or modified.</li>
                        <li className="flex items-start gap-2"><span className="text-primary-500 mt-0.5">•</span>Ensure your bank details are correct. Incorrect details may cause delays.</li>
                        {payoutModal === 'advance' && (
                          <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span>Advance payouts are limited to 10–50% of your available balance.</li>
                        )}
                      </ul>
                      <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-border">
                        <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                        <span className="text-xs text-text-primary">I have read and agree to the terms and conditions. I confirm that the bank account details shown above are correct.</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {!bankLoading && !payoutSuccess && bankDetails?.bankVerified && (
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border sticky bottom-0 bg-white">
                  <Button variant="ghost" size="sm" onClick={closePayoutModal} disabled={payoutLoading}>Cancel</Button>
                  <Button size="sm"
                    onClick={payoutModal === 'manual' ? handleManualPayout : handleAdvancePayout}
                    disabled={payoutLoading || !acceptedTerms || (payoutModal === 'manual' && (!payoutAmount || parseFloat(payoutAmount) < 100)) || (payoutModal === 'advance' && advanceAmount < 100)}
                    className={payoutModal === 'advance' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                  >
                    {payoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <><Send size={14} />{payoutModal === 'manual' ? `Transfer ${payoutAmount ? fmtDec(parseFloat(payoutAmount)) : '₹0'}` : `Transfer ${fmtDec(advanceAmount)}`}</>
                    )}
                  </Button>
                </div>
              )}

              {payoutSuccess && (
                <div className="flex items-center justify-center px-6 py-4 border-t border-border">
                  <Button size="sm" onClick={closePayoutModal}>Done</Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function buildPayoutCycles(deliveredOrders: SimpleOrder[], commRate: number): PayoutCycle[] {
  const monthMap = new Map<string, SimpleOrder[]>();
  deliveredOrders.forEach((o) => {
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap.has(key)) monthMap.set(key, []);
    monthMap.get(key)!.push(o);
  });

  const cycles: PayoutCycle[] = [];
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const sorted = Array.from(monthMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  sorted.forEach(([key, ords]) => {
    const gross = ords.reduce((s, o) => s + o.total, 0);
    const comm = gross * commRate / 100;
    const net = gross - comm;
    const [y, m] = key.split('-');
    const monthName = new Date(Number(y), Number(m) - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    cycles.push({
      id: key, period: monthName, grossSales: gross, commission: comm, netPayout: net,
      orders: ords.length, status: key === currentKey ? 'processing' : 'paid',
      date: key === currentKey ? 'Current cycle' : `Settled ${monthName}`,
    });
  });

  return cycles;
}
