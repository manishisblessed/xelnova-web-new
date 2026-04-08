'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Send, RefreshCw, BarChart3 } from 'lucide-react';
import { apiGetAbandonedCarts, apiSendAbandonedCartReminders, apiGetAbandonedCartStats } from '@/lib/api';

type AbandonedCart = { userId: string; email: string; name: string; items: { name: string; price: number }[]; totalValue: number };
type Stats = { totalSent: number; converted: number; conversionRate: string };

export default function AbandonedCartsPage() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [hours, setHours] = useState(24);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cartsData, statsData] = await Promise.all([
        apiGetAbandonedCarts(hours) as Promise<AbandonedCart[]>,
        apiGetAbandonedCartStats() as Promise<Stats>,
      ]);
      setCarts(cartsData);
      setStats(statsData);
    } catch {}
    setLoading(false);
  }, [hours]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSend = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const res = await apiSendAbandonedCartReminders(hours) as any;
      setSendResult(`Found: ${res.found}, Sent: ${res.sent}, Skipped: ${res.skipped}`);
      loadData();
    } catch (err: any) {
      setSendResult(`Error: ${err.message}`);
    }
    setSending(false);
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Abandoned Carts</h1>
          <p className="text-sm text-gray-500">Users who left items in their cart without ordering</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value={6}>Last 6 hours</option>
            <option value={12}>Last 12 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={48}>Last 48 hours</option>
            <option value={72}>Last 72 hours</option>
          </select>
          <button onClick={loadData} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Refresh
          </button>
          <button onClick={handleSend} disabled={sending} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
            <Send size={16} />{sending ? 'Sending...' : 'Send Reminders'}
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total Reminders Sent</p>
            <p className="text-2xl font-bold">{stats.totalSent}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Converted</p>
            <p className="text-2xl font-bold text-green-600">{stats.converted}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Conversion Rate</p>
            <p className="text-2xl font-bold">{stats.conversionRate}%</p>
          </div>
        </div>
      )}

      {sendResult && (
        <div className="mb-4 p-3 bg-blue-50 rounded-xl text-sm text-blue-700">{sendResult}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : carts.length === 0 ? (
        <div className="bg-green-50 rounded-2xl p-8 text-center">
          <ShoppingBag size={40} className="mx-auto mb-3 text-green-400" />
          <p className="text-green-700 font-medium">No abandoned carts found in this time window!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {carts.map((cart, i) => (
            <motion.div key={cart.userId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium">{cart.name}</p>
                  <p className="text-xs text-gray-400">{cart.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">₹{cart.totalValue.toFixed(0)}</p>
                  <p className="text-xs text-gray-400">{cart.items.length} item(s)</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {cart.items.slice(0, 4).map((item, j) => (
                  <span key={j} className="text-xs bg-gray-100 rounded-lg px-2 py-1">{item.name} · ₹{item.price.toFixed(0)}</span>
                ))}
                {cart.items.length > 4 && <span className="text-xs text-gray-400">+{cart.items.length - 4} more</span>}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
