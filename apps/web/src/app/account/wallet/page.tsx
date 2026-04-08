"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  IndianRupee,
} from "lucide-react";
import { formatCurrency } from "@xelnova/utils";
import { walletApi, setAccessToken } from "@xelnova/api";

type WalletTransaction = Awaited<ReturnType<typeof walletApi.getCustomerTransactions>>["transactions"][number];

function syncToken() {
  if (typeof document === "undefined") return;
  const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
  if (m) setAccessToken(decodeURIComponent(m[1]));
}

export default function WalletPage() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    syncToken();

    Promise.all([
      walletApi.getCustomerBalance(),
      walletApi.getCustomerTransactions(),
    ])
      .then(([bal, txns]) => {
        if (cancelled) return;
        setBalance(bal.balance);
        setTransactions(txns.transactions);
      })
      .catch((e: { message?: string }) => {
        if (!cancelled) setError(e.message ?? "Failed to load wallet");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
          Wallet credits can be used during checkout or received as refunds.
        </p>
      </motion.div>

      {/* Transactions */}
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
                <div
                  className={`flex items-center justify-center h-9 w-9 rounded-full ${
                    isCredit ? "bg-emerald-50" : "bg-red-50"
                  }`}
                >
                  {isCredit ? (
                    <ArrowDownLeft size={16} className="text-emerald-600" />
                  ) : (
                    <ArrowUpRight size={16} className="text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {txn.description}
                  </p>
                  <p className="text-xs text-text-muted">
                    {new Date(txn.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <p
                  className={`text-sm font-bold ${
                    isCredit ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {isCredit ? "+" : "-"}
                  {formatCurrency(txn.amount)}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
