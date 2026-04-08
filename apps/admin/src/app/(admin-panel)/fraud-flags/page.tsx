'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { apiGetFraudFlags, apiReviewFraudFlag } from '@/lib/api';

type FraudFlag = {
  id: string; orderId: string; userId: string; rules: string[];
  riskScore: number; status: string; adminNote: string | null;
  reviewedBy: string | null; createdAt: string;
};

export default function FraudFlagsPage() {
  const [flags, setFlags] = useState<FraudFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGetFraudFlags(1, showAll) as any;
      setFlags(res.flags || []);
    } catch {}
    setLoading(false);
  }, [showAll]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleReview = async (flagId: string, status: 'CLEARED' | 'BLOCKED') => {
    try {
      await apiReviewFraudFlag(flagId, { status, adminNote: reviewNote || `Marked as ${status.toLowerCase()}` });
      setReviewingId(null);
      setReviewNote('');
      loadData();
    } catch {}
  };

  const riskColor = (score: number) => {
    if (score >= 60) return 'bg-red-100 text-red-700';
    if (score >= 30) return 'bg-amber-100 text-amber-700';
    return 'bg-green-100 text-green-700';
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700',
      CLEARED: 'bg-green-100 text-green-700',
      BLOCKED: 'bg-red-100 text-red-700',
      REVIEWED: 'bg-blue-100 text-blue-700',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Fraud Detection</h1>
          <p className="text-sm text-gray-500">Orders flagged by the rules engine for review</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="rounded" />
            Show all (including reviewed)
          </label>
          <button onClick={loadData} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : flags.length === 0 ? (
        <div className="bg-green-50 rounded-2xl p-8 text-center">
          <ShieldAlert size={40} className="mx-auto mb-3 text-green-400" />
          <p className="text-green-700 font-medium">No fraud flags to review!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map((flag, i) => (
            <motion.div key={flag.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskColor(flag.riskScore)}`}>
                      Risk: {flag.riskScore}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(flag.status)}`}>
                      {flag.status}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(flag.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                  <div><span className="text-gray-400">Order:</span> <span className="font-mono text-xs">{flag.orderId}</span></div>
                  <div><span className="text-gray-400">User:</span> <span className="font-mono text-xs">{flag.userId}</span></div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {flag.rules.map((rule) => (
                    <span key={rule} className="text-xs bg-gray-100 rounded px-2 py-0.5 font-mono">{rule}</span>
                  ))}
                </div>
                {flag.adminNote && <p className="text-xs text-gray-500 mb-2">Note: {flag.adminNote}</p>}

                {flag.status === 'PENDING' && (
                  reviewingId === flag.id ? (
                    <div className="flex items-center gap-2">
                      <input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Admin note..." className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
                      <button onClick={() => handleReview(flag.id, 'CLEARED')} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100">
                        <CheckCircle size={14} />Clear
                      </button>
                      <button onClick={() => handleReview(flag.id, 'BLOCKED')} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                        <XCircle size={14} />Block
                      </button>
                      <button onClick={() => setReviewingId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setReviewingId(flag.id)} className="text-xs text-violet-600 font-medium hover:underline">Review this flag</button>
                  )
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
