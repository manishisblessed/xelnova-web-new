'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Bell, Package, RefreshCw } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { apiGetInventoryAlerts, apiSendInventoryAlerts } from '@/lib/api';
import Image from 'next/image';

type AlertProduct = {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  lowStockThreshold: number;
  images: string[];
  status: string;
};

export default function InventoryAlertsPage() {
  const [products, setProducts] = useState<AlertProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [notifyResult, setNotifyResult] = useState<string | null>(null);

  const loadAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetInventoryAlerts() as AlertProduct[];
      setProducts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAlerts(); }, []);

  const handleNotify = async () => {
    setSending(true);
    setNotifyResult(null);
    try {
      const res = await apiSendInventoryAlerts() as { sent: boolean; count?: number };
      setNotifyResult(res.sent ? `Email sent for ${res.count} low-stock products` : 'No low-stock products to alert about');
    } catch (err: any) {
      setNotifyResult(`Failed: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <DashboardHeader title="Inventory Alerts" subtitle="Products running low on stock" />
      <div className="p-6 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={loadAlerts} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={handleNotify} disabled={sending} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50">
            <Bell size={16} />
            {sending ? 'Sending...' : 'Email Alert to Me'}
          </button>
          {notifyResult && <span className="text-sm text-gray-600">{notifyResult}</span>}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">{error}</div>
        )}

        {!loading && products.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
            <Package size={40} className="mx-auto mb-3 text-green-400" />
            <p className="text-green-700 font-medium">All products are well-stocked!</p>
            <p className="text-green-600 text-sm mt-1">No products below their low stock threshold.</p>
          </div>
        )}

        {products.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-amber-800">Product</th>
                  <th className="px-4 py-3 text-left font-medium text-amber-800">SKU</th>
                  <th className="px-4 py-3 text-center font-medium text-amber-800">Stock</th>
                  <th className="px-4 py-3 text-center font-medium text-amber-800">Threshold</th>
                  <th className="px-4 py-3 text-center font-medium text-amber-800">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] && (
                          <Image src={p.images[0]} alt="" width={40} height={40} className="w-10 h-10 rounded-lg object-cover" />
                        )}
                        <span className="font-medium truncate max-w-[250px]">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${p.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {p.stock === 0 && <AlertTriangle size={12} />}
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{p.lowStockThreshold}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.stock === 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                        {p.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
