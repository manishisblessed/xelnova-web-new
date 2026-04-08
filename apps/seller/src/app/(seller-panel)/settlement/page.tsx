'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Calendar, IndianRupee } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { apiGetSettlement, apiDownloadSettlementCsv } from '@/lib/api';

type SettlementRow = {
  orderNumber: string;
  date: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  gross: number;
  commissionPercent: number;
  commission: number;
  net: number;
  orderStatus: string;
  paymentMethod: string;
};

type SettlementReport = {
  rows: SettlementRow[];
  totals: { gross: number; commission: number; net: number };
  commissionRate: number;
};

export default function SettlementPage() {
  const [report, setReport] = useState<SettlementReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const data = await apiGetSettlement(params) as SettlementReport;
      setReport(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const handleExport = async () => {
    const params: Record<string, string> = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    await apiDownloadSettlementCsv(params);
  };

  return (
    <>
      <DashboardHeader title="Settlement Report" subtitle="Track your earnings, commissions, and payouts" />
      <div className="p-6 max-w-6xl">
        <div className="flex flex-wrap items-end gap-3 mb-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <button onClick={loadReport} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors">
            <Calendar size={16} />
            Apply
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">{error}</div>
        )}

        {report && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><IndianRupee size={16} />Gross Revenue</div>
                <div className="text-2xl font-bold text-gray-900">₹{report.totals.gross.toFixed(2)}</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><FileText size={16} />Commission ({report.commissionRate}%)</div>
                <div className="text-2xl font-bold text-red-600">-₹{report.totals.commission.toFixed(2)}</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-violet-50 rounded-2xl border border-violet-200 p-5">
                <div className="flex items-center gap-2 text-violet-600 text-sm mb-1"><IndianRupee size={16} />Net Earnings</div>
                <div className="text-2xl font-bold text-violet-700">₹{report.totals.net.toFixed(2)}</div>
              </motion.div>
            </div>

            {report.rows.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-500">No settlement data for the selected period.</div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-medium text-gray-600">Order</th>
                        <th className="px-3 py-2.5 text-left font-medium text-gray-600">Date</th>
                        <th className="px-3 py-2.5 text-left font-medium text-gray-600">Product</th>
                        <th className="px-3 py-2.5 text-right font-medium text-gray-600">Qty</th>
                        <th className="px-3 py-2.5 text-right font-medium text-gray-600">Gross</th>
                        <th className="px-3 py-2.5 text-right font-medium text-gray-600">Commission</th>
                        <th className="px-3 py-2.5 text-right font-medium text-gray-600">Net</th>
                        <th className="px-3 py-2.5 text-center font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((r, i) => (
                        <tr key={i} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs">{r.orderNumber}</td>
                          <td className="px-3 py-2 text-gray-500">{r.date}</td>
                          <td className="px-3 py-2 truncate max-w-[200px]">{r.productName}</td>
                          <td className="px-3 py-2 text-right">{r.quantity}</td>
                          <td className="px-3 py-2 text-right">₹{r.gross.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-red-600">-₹{r.commission.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-medium">₹{r.net.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{r.orderStatus}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
