"use client";

import { useEffect, useState } from "react";
import { Gift, Copy, Users, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { notificationsApi, setAccessToken } from "@xelnova/api";

function syncToken() {
  if (typeof document === "undefined") return;
  const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
  if (m) setAccessToken(decodeURIComponent(m[1]));
}

type LedgerEntry = { id: string; points: number; type: string; description: string; createdAt: string };

export default function LoyaltyPage() {
  const [balance, setBalance] = useState(0);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [referralCode, setReferralCode] = useState("");
  const [referralStats, setReferralStats] = useState<{ totalUses: number; earnedPoints: number } | null>(null);
  const [applyCode, setApplyCode] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    syncToken();
    setLoading(true);
    try {
      const [bal, led, ref, stats] = await Promise.all([
        notificationsApi.getLoyaltyBalance(),
        notificationsApi.getLoyaltyLedger(),
        notificationsApi.getReferralCode(),
        notificationsApi.getReferralStats(),
      ]);
      setBalance((bal as any).points || 0);
      setLedger((led as any).entries || []);
      setReferralCode((ref as any).code || "");
      setReferralStats(stats as any);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleRedeem = async () => {
    const pts = parseInt(redeemAmount);
    if (!pts || pts <= 0) return;
    try {
      const res = await notificationsApi.redeemPoints(pts) as any;
      setMessage(
        res?.message ||
          `Redeemed ${res.pointsRedeemed} points — ₹${res.discountAmount} added to your wallet. View it under Account → Wallet.`,
      );
      setRedeemAmount("");
      loadData();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || "Failed to redeem");
    }
  };

  const handleApplyReferral = async () => {
    if (!applyCode.trim()) return;
    try {
      const res = await notificationsApi.applyReferralCode(applyCode.trim()) as any;
      setMessage(`Referral applied! You earned ${res.referredPoints} points.`);
      setApplyCode("");
      loadData();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || "Invalid referral code");
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setMessage("Referral code copied!");
    setTimeout(() => setMessage(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-text-primary">Loyalty & Referral</h2>

      {message && (
        <div className="p-3 bg-primary-50 rounded-xl text-sm text-primary-700">{message}</div>
      )}

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Gift size={24} />
          <span className="text-sm opacity-80">Loyalty Points</span>
        </div>
        <p className="text-4xl font-bold mb-1">{balance.toLocaleString()}</p>
        <p className="text-sm opacity-70">= ₹{(balance / 10).toFixed(0)} discount value</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Redeem */}
        <div className="rounded-2xl border border-border bg-white p-5">
          <h3 className="font-semibold mb-3">Redeem Points</h3>
          <div className="flex gap-2">
            <input
              type="number"
              value={redeemAmount}
              onChange={(e) => setRedeemAmount(e.target.value)}
              placeholder="Points to redeem"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm"
              min="10"
            />
            <button
              onClick={handleRedeem}
              disabled={!redeemAmount || parseInt(redeemAmount) <= 0}
              className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              Redeem
            </button>
          </div>
          <p className="text-xs text-text-secondary mt-2">
            10 points = ₹1. Redeemed points are credited to your <a href="/account/wallet" className="text-primary-600 font-medium hover:underline">Xelnova Wallet</a> instantly.
          </p>
        </div>

        {/* Referral */}
        <div className="rounded-2xl border border-border bg-white p-5">
          <h3 className="font-semibold mb-3">Your Referral Code</h3>
          {referralCode ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <code className="flex-1 px-3 py-2 bg-gray-100 rounded-xl text-center font-mono text-lg font-bold tracking-wider">
                  {referralCode}
                </code>
                <button onClick={copyCode} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <Copy size={18} />
                </button>
              </div>
              {referralStats && (
                <div className="flex gap-4 text-sm text-text-secondary">
                  <span className="flex items-center gap-1"><Users size={14} />{referralStats.totalUses} referrals</span>
                  <span className="flex items-center gap-1"><Gift size={14} />{referralStats.earnedPoints} pts earned</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-text-secondary">Loading...</p>
          )}
        </div>
      </div>

      {/* Apply Referral */}
      <div className="rounded-2xl border border-border bg-white p-5">
        <h3 className="font-semibold mb-3">Have a referral code?</h3>
        <div className="flex gap-2">
          <input
            value={applyCode}
            onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
            placeholder="Enter referral code"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm"
          />
          <button
            onClick={handleApplyReferral}
            disabled={!applyCode.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Ledger */}
      <div className="rounded-2xl border border-border bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold">Points History</h3>
        </div>
        {ledger.length === 0 ? (
          <div className="p-8 text-center text-text-secondary text-sm">No transactions yet. Start shopping to earn points!</div>
        ) : (
          <div className="divide-y divide-border">
            {ledger.map((entry) => (
              <div key={entry.id} className="px-5 py-3 flex items-center gap-3">
                <div className={`p-1.5 rounded-full ${entry.points > 0 ? "bg-green-100" : "bg-red-100"}`}>
                  {entry.points > 0 ? <ArrowUpRight size={14} className="text-green-600" /> : <ArrowDownRight size={14} className="text-red-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{entry.description}</p>
                  <p className="text-xs text-text-secondary">{new Date(entry.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-sm font-semibold ${entry.points > 0 ? "text-green-600" : "text-red-600"}`}>
                  {entry.points > 0 ? "+" : ""}{entry.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
