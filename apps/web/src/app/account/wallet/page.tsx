"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  IndianRupee,
  Plus,
  Send,
  Smartphone,
  FileText,
  CheckCircle,
} from "lucide-react";
import { formatCurrency } from "@xelnova/utils";
import { walletApi, setAccessToken } from "@xelnova/api";

type WalletTransaction = Awaited<ReturnType<typeof walletApi.getCustomerTransactions>>["transactions"][number];
type Tab = "overview" | "add" | "transfer" | "recharge" | "bills";

function syncToken() {
  if (typeof document === "undefined") return;
  const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
  if (m) setAccessToken(decodeURIComponent(m[1]));
}

const tabs: { id: Tab; label: string; icon: typeof Wallet }[] = [
  { id: "overview", label: "Overview", icon: Wallet },
  { id: "add", label: "Add Money", icon: Plus },
  { id: "transfer", label: "Transfer", icon: Send },
  { id: "recharge", label: "Recharge", icon: Smartphone },
  { id: "bills", label: "Pay Bills", icon: FileText },
];

export default function WalletPage() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    try {
      syncToken();
      const [bal, txns] = await Promise.all([
        walletApi.getCustomerBalance(),
        walletApi.getCustomerTransactions(),
      ]);
      setBalance(bal.balance);
      setTransactions(txns.transactions);
    } catch (e: any) {
      setError(e.message ?? "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWallet(); }, [loadWallet]);

  const handleAddMoney = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const amount = Number((form.elements.namedItem("amount") as HTMLInputElement).value);
    if (!amount || amount < 10) { setActionError("Minimum ₹10 required"); return; }
    setActionLoading(true);
    setActionError(null);
    try {
      const order = await walletApi.createAddMoneyOrder(amount);
      const options = {
        key: order.keyId,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: "Xelnova Wallet",
        description: `Add ₹${amount} to wallet`,
        order_id: order.razorpayOrderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await walletApi.verifyAddMoney(response);
            setActionSuccess(`₹${amount} added to wallet!`);
            loadWallet();
          } catch { setActionError("Payment verification failed"); }
        },
        theme: { color: "#7c3aed" },
      };
      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (e: any) {
      setActionError(e.message || "Failed to initiate payment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setActionLoading(true);
    setActionError(null);
    try {
      await walletApi.requestBankTransfer({
        amount: Number(fd.get("amount")),
        accountNumber: String(fd.get("accountNumber")),
        ifscCode: String(fd.get("ifscCode")),
        accountHolder: String(fd.get("accountHolder")),
      });
      setActionSuccess("Transfer request submitted!");
      form.reset();
      loadWallet();
    } catch (e: any) {
      setActionError(e.message || "Transfer failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecharge = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setActionLoading(true);
    setActionError(null);
    try {
      await walletApi.processRecharge({
        amount: Number(fd.get("amount")),
        identifier: String(fd.get("identifier")),
        operator: String(fd.get("operator")),
        type: String(fd.get("type") || "mobile"),
      });
      setActionSuccess("Recharge processing!");
      form.reset();
      loadWallet();
    } catch (e: any) {
      setActionError(e.message || "Recharge failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBillPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setActionLoading(true);
    setActionError(null);
    try {
      await walletApi.processBillPayment({
        amount: Number(fd.get("amount")),
        billerId: String(fd.get("billerId")),
        consumerNumber: String(fd.get("consumerNumber")),
        category: String(fd.get("category") || "other"),
      });
      setActionSuccess("Bill payment processing!");
      form.reset();
      loadWallet();
    } catch (e: any) {
      setActionError(e.message || "Bill payment failed");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (actionSuccess) {
      const t = setTimeout(() => setActionSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [actionSuccess]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
        <p className="mt-4 text-sm text-text-secondary">Loading wallet…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-danger-500" />
        <p className="mt-3 text-sm text-text-primary">{error}</p>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500";
  const btnClass = "w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20 disabled:opacity-50";

  return (
    <div>
      <h2 className="text-lg font-bold text-text-primary mb-6">My Wallet</h2>

      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 p-6 text-white shadow-lg mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-white/20">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm opacity-80">Available Balance</p>
            <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
          </div>
        </div>
        <p className="text-xs opacity-70">
          Add money to pay for recharges, bills, transfers & shopping.
        </p>
      </motion.div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setActionError(null); setActionSuccess(null); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-white text-primary-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Success/Error banners */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-sm text-emerald-700"
          >
            <CheckCircle size={16} /> {actionSuccess}
          </motion.div>
        )}
      </AnimatePresence>
      {actionError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-700">
          <AlertCircle size={16} /> {actionError}
        </div>
      )}

      {/* Tab content */}
      {activeTab === "overview" && (
        <div>
          <h3 className="text-sm font-bold text-text-primary mb-4">Transaction History</h3>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white py-12 text-center shadow-card">
              <div className="rounded-full bg-gray-50 p-4 mb-3">
                <IndianRupee size={28} className="text-gray-300" />
              </div>
              <p className="text-sm text-text-secondary">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((txn, i) => {
                const isCredit = txn.type === "CREDIT";
                return (
                  <motion.div
                    key={txn.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 shadow-sm"
                  >
                    <div className={`flex items-center justify-center h-9 w-9 rounded-full ${isCredit ? "bg-emerald-50" : "bg-red-50"}`}>
                      {isCredit ? <ArrowDownLeft size={16} className="text-emerald-600" /> : <ArrowUpRight size={16} className="text-red-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{txn.description}</p>
                      <p className="text-xs text-text-muted">
                        {new Date(txn.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <p className={`text-sm font-bold ${isCredit ? "text-emerald-600" : "text-red-600"}`}>
                      {isCredit ? "+" : "-"}{formatCurrency(txn.amount)}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "add" && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-card">
          <h3 className="text-sm font-bold text-text-primary mb-1">Add Money to Wallet</h3>
          <p className="text-xs text-text-muted mb-5">2% convenience fee applies. Secure payment via Razorpay.</p>
          <form onSubmit={handleAddMoney} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Amount (₹)</label>
              <input name="amount" type="number" min="10" step="1" required placeholder="Enter amount" className={inputClass} />
              <p className="text-[11px] text-text-muted mt-1">Min ₹10. 2% fee will be added at checkout.</p>
            </div>
            <div className="flex gap-2">
              {[100, 500, 1000, 2000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={(e) => {
                    const input = (e.currentTarget.closest("form") as HTMLFormElement)?.elements.namedItem("amount") as HTMLInputElement;
                    if (input) input.value = String(amt);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-colors"
                >
                  ₹{amt}
                </button>
              ))}
            </div>
            <button type="submit" disabled={actionLoading} className={btnClass}>
              {actionLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Proceed to Pay"}
            </button>
          </form>
        </div>
      )}

      {activeTab === "transfer" && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-card">
          <h3 className="text-sm font-bold text-text-primary mb-1">Transfer to Bank Account</h3>
          <p className="text-xs text-text-muted mb-5">Transfer funds from your wallet to any bank account. Min ₹100.</p>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Amount (₹)</label>
              <input name="amount" type="number" min="100" required placeholder="Min ₹100" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Account Holder Name</label>
              <input name="accountHolder" type="text" required placeholder="As per bank records" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Account Number</label>
              <input name="accountNumber" type="text" required placeholder="Enter account number" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">IFSC Code</label>
              <input name="ifscCode" type="text" required placeholder="e.g. SBIN0001234" className={inputClass} />
            </div>
            <button type="submit" disabled={actionLoading} className={btnClass}>
              {actionLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Transfer Now"}
            </button>
          </form>
        </div>
      )}

      {activeTab === "recharge" && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-card">
          <h3 className="text-sm font-bold text-text-primary mb-1">Mobile / DTH Recharge</h3>
          <p className="text-xs text-text-muted mb-5">Pay from your wallet balance instantly.</p>
          <form onSubmit={handleRecharge} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Type</label>
              <select name="type" className={inputClass}>
                <option value="mobile">Mobile Prepaid</option>
                <option value="dth">DTH</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Mobile Number / DTH ID</label>
              <input name="identifier" type="text" required placeholder="Enter number" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Operator</label>
              <select name="operator" required className={inputClass}>
                <option value="">Select operator</option>
                <option value="Jio">Jio</option>
                <option value="Airtel">Airtel</option>
                <option value="Vi">Vi (Vodafone Idea)</option>
                <option value="BSNL">BSNL</option>
                <option value="Tata Sky">Tata Sky</option>
                <option value="DishTV">DishTV</option>
                <option value="D2H">D2H</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Amount (₹)</label>
              <input name="amount" type="number" min="10" required placeholder="Enter amount" className={inputClass} />
            </div>
            <button type="submit" disabled={actionLoading} className={btnClass}>
              {actionLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Recharge Now"}
            </button>
          </form>
        </div>
      )}

      {activeTab === "bills" && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-card">
          <h3 className="text-sm font-bold text-text-primary mb-1">Pay Bills</h3>
          <p className="text-xs text-text-muted mb-5">Electricity, gas, water, broadband & more.</p>
          <form onSubmit={handleBillPayment} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Bill Category</label>
              <select name="category" className={inputClass}>
                <option value="electricity">Electricity</option>
                <option value="gas">Gas</option>
                <option value="water">Water</option>
                <option value="broadband">Broadband</option>
                <option value="insurance">Insurance</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Biller / Provider</label>
              <input name="billerId" type="text" required placeholder="e.g. TATA Power Delhi" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Consumer Number</label>
              <input name="consumerNumber" type="text" required placeholder="Your consumer/account number" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Amount (₹)</label>
              <input name="amount" type="number" min="1" required placeholder="Bill amount" className={inputClass} />
            </div>
            <button type="submit" disabled={actionLoading} className={btnClass}>
              {actionLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Pay Now"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
