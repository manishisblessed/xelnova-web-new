'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Send, CheckCircle } from 'lucide-react';
import { apiCreateAdvancePayout, apiGetSellerShares, apiSettleOrder } from '@/lib/api';

type SellerShare = { sellerId: string; storeName: string; gross: number; commissionRate: number; commission: number; net: number };
type SharesResult = { orderId: string; orderNumber: string; total: number; shares: SellerShare[] };

export default function AdvancePayoutsPage() {
  const [sellerId, setSellerId] = useState('');
  const [amount, setAmount] = useState('');
  const [orderId, setOrderId] = useState('');
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const [sharesOrderId, setSharesOrderId] = useState('');
  const [shares, setShares] = useState<SharesResult | null>(null);
  const [loadingShares, setLoadingShares] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settleResult, setSettleResult] = useState<string | null>(null);

  const handleAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerId.trim() || !amount) return;
    setCreating(true);
    setResult(null);
    try {
      const res = await apiCreateAdvancePayout({
        sellerId: sellerId.trim(),
        amount: parseFloat(amount),
        orderId: orderId.trim() || undefined,
        note: note.trim() || undefined,
      }) as any;
      setResult(`Advance payout of ₹${res.amount} created for ${res.sellerName}`);
      setSellerId(''); setAmount(''); setOrderId(''); setNote('');
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
    }
    setCreating(false);
  };

  const handleLoadShares = async () => {
    if (!sharesOrderId.trim()) return;
    setLoadingShares(true);
    setShares(null);
    try {
      const res = await apiGetSellerShares(sharesOrderId.trim()) as SharesResult;
      setShares(res);
    } catch {}
    setLoadingShares(false);
  };

  const handleSettle = async () => {
    if (!sharesOrderId.trim()) return;
    setSettling(true);
    setSettleResult(null);
    try {
      const res = await apiSettleOrder(sharesOrderId.trim()) as any;
      setSettleResult(`${res.settled} payout(s) created`);
    } catch (err: any) {
      setSettleResult(`Error: ${err.message}`);
    }
    setSettling(false);
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Split Payments & Advance Payouts</h1>
      <p className="text-sm text-gray-500 mb-6">Manage seller shares and emergency advance payouts</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Advance Payout */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2"><CreditCard size={18} />Create Advance Payout</h2>
          <form onSubmit={handleAdvance} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Seller ID *</label>
              <input value={sellerId} onChange={(e) => setSellerId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Amount (₹) *</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required min="1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Order ID (optional)</label>
              <input value={orderId} onChange={(e) => setOrderId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Note</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <button type="submit" disabled={creating} className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
              <Send size={16} />{creating ? 'Creating...' : 'Create Advance Payout'}
            </button>
          </form>
          {result && <p className="mt-3 text-sm text-gray-600">{result}</p>}
        </motion.div>

        {/* Seller Shares */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold mb-4">Order Seller Shares</h2>
          <div className="flex gap-2 mb-4">
            <input value={sharesOrderId} onChange={(e) => setSharesOrderId(e.target.value)} placeholder="Order ID" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <button onClick={handleLoadShares} disabled={loadingShares} className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
              {loadingShares ? 'Loading...' : 'Compute'}
            </button>
          </div>

          {shares && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Order {shares.orderNumber} · Total: ₹{shares.total}</p>
              {shares.shares.map((s) => (
                <div key={s.sellerId} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm font-medium">{s.storeName}</p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <span>Gross: ₹{s.gross.toFixed(2)}</span>
                    <span>Commission ({s.commissionRate}%): ₹{s.commission.toFixed(2)}</span>
                    <span className="font-medium text-green-700">Net: ₹{s.net.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              <button onClick={handleSettle} disabled={settling} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                <CheckCircle size={16} />{settling ? 'Settling...' : 'Create Settlement Payouts'}
              </button>
              {settleResult && <p className="text-sm text-gray-600">{settleResult}</p>}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
