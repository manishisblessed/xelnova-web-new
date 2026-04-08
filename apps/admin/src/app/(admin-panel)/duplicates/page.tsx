'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Copy, EyeOff, RefreshCw, CheckCircle } from 'lucide-react';
import { apiScanDuplicates, apiHideDuplicate } from '@/lib/api';

type DuplicateProduct = { id: string; name: string; slug: string; sku: string | null; price: number; sellerId: string; sellerName: string; images: string[] };
type DuplicateGroup = { key: string; reason: string; products: DuplicateProduct[] };

export default function DuplicatesPage() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiding, setHiding] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiScanDuplicates() as DuplicateGroup[];
      setGroups(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleHide = async (productId: string) => {
    setHiding(productId);
    try {
      await apiHideDuplicate(productId);
      loadData();
    } catch {}
    setHiding(null);
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Duplicate Listings</h1>
          <p className="text-sm text-gray-500">Potential duplicate products detected by heuristics</p>
        </div>
        <button onClick={loadData} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Re-scan
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Scanning...</div>
      ) : groups.length === 0 ? (
        <div className="bg-green-50 rounded-2xl p-8 text-center">
          <CheckCircle size={40} className="mx-auto mb-3 text-green-400" />
          <p className="text-green-700 font-medium">No duplicate listings found!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g, gi) => (
            <motion.div key={g.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.05 }} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                <Copy size={16} className="text-amber-600" />
                <span className="text-sm font-medium text-amber-800">{g.reason}</span>
                <span className="text-xs text-amber-600 ml-auto">{g.products.length} products</span>
              </div>
              <div className="divide-y">
                {g.products.map((p) => (
                  <div key={p.id} className="px-4 py-3 flex items-center gap-4">
                    {p.images?.[0] && <Image src={p.images[0]} alt="" width={40} height={40} className="w-10 h-10 rounded-lg object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">SKU: {p.sku || '—'} · Seller: {p.sellerName} · ₹{p.price}</p>
                    </div>
                    <button onClick={() => handleHide(p.id)} disabled={hiding === p.id} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50">
                      <EyeOff size={14} />{hiding === p.id ? 'Hiding...' : 'Hide'}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
