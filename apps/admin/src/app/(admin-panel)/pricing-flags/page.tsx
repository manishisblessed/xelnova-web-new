'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { apiScanPricing } from '@/lib/api';

type PricingFlag = { productId: string; productName: string; sku: string | null; sellerId: string; sellerName: string; price: number; compareAtPrice: number | null; reason: string; severity: 'warning' | 'critical' };

export default function PricingFlagsPage() {
  const [flags, setFlags] = useState<PricingFlag[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiScanPricing() as PricingFlag[];
      setFlags(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pricing Flags</h1>
          <p className="text-sm text-gray-500">Products with pricing anomalies</p>
        </div>
        <button onClick={loadData} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Re-scan
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Scanning...</div>
      ) : flags.length === 0 ? (
        <div className="bg-green-50 rounded-2xl p-8 text-center">
          <CheckCircle size={40} className="mx-auto mb-3 text-green-400" />
          <p className="text-green-700 font-medium">No pricing issues found!</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-left font-medium">Seller</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Compare</th>
                <th className="px-4 py-3 text-left font-medium">Issue</th>
                <th className="px-4 py-3 text-center font-medium">Severity</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((f, i) => (
                <motion.tr key={f.productId + i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium truncate max-w-[200px]">{f.productName}</p>
                    <p className="text-xs text-gray-400">SKU: {f.sku || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{f.sellerName}</td>
                  <td className="px-4 py-3 text-right font-mono">₹{f.price}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-400">{f.compareAtPrice ? `₹${f.compareAtPrice}` : '—'}</td>
                  <td className="px-4 py-3 text-sm">{f.reason}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${f.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      <AlertTriangle size={12} />{f.severity}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
