'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Download, Calendar } from 'lucide-react';
import { apiGetGstReport, apiDownloadGstCsv, apiGetTdsReport, apiDownloadTdsCsv, apiGetRefundReport } from '@/lib/api';

type GstRow = { orderNumber: string; date: string; customerName: string; productName: string; hsnCode: string; quantity: number; unitPrice: number; taxableValue: number; gstRate: number; cgst: number; sgst: number; totalGst: number; totalAmount: number };
type TdsRow = { payoutId: string; date: string; sellerName: string; pan: string; gstin: string; grossAmount: number; tdsRate: number; tdsAmount: number; netAmount: number; status: string; isAdvance: boolean };
type RefundRow = { returnId: string; orderNumber: string; date: string; customerName: string; reason: string; status: string; orderTotal: number; refundAmount: number; paymentMethod: string };

export default function ReportsPage() {
  const [tab, setTab] = useState<'gst' | 'tds' | 'refunds'>('gst');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [gstData, setGstData] = useState<{ rows: GstRow[]; totals: any } | null>(null);
  const [tdsData, setTdsData] = useState<{ rows: TdsRow[]; totals: any } | null>(null);
  const [refundData, setRefundData] = useState<RefundRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    const p: Record<string, string> = {};
    if (dateFrom) p.dateFrom = dateFrom;
    if (dateTo) p.dateTo = dateTo;
    setLoading(true);
    try {
      if (tab === 'gst') setGstData(await apiGetGstReport(p) as any);
      else if (tab === 'tds') setTdsData(await apiGetTdsReport(p) as any);
      else setRefundData(await apiGetRefundReport(p) as RefundRow[]);
    } catch {}
    setLoading(false);
  }, [tab, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="p-6 max-w-7xl">
      <h1 className="text-2xl font-bold mb-1">Reports</h1>
      <p className="text-sm text-gray-500 mb-6">GST, TDS, and refund reports for compliance</p>

      <div className="flex gap-2 mb-4">
        {(['gst', 'tds', 'refunds'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? 'bg-violet-600 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}>
            {t === 'gst' ? 'GST Report' : t === 'tds' ? 'TDS Report' : 'Refund Report'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors">
          <Calendar size={16} />Apply
        </button>
        {tab !== 'refunds' && (
          <button onClick={() => { const p: Record<string, string> = {}; if (dateFrom) p.dateFrom = dateFrom; if (dateTo) p.dateTo = dateTo; tab === 'gst' ? apiDownloadGstCsv(p) : apiDownloadTdsCsv(p); }} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
            <Download size={16} />Export CSV
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : tab === 'gst' && gstData ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-3 gap-4 p-4 border-b bg-gray-50">
            <div><span className="text-xs text-gray-500">Taxable Value</span><div className="text-lg font-bold">₹{gstData.totals.taxableValue?.toFixed(2)}</div></div>
            <div><span className="text-xs text-gray-500">Total GST</span><div className="text-lg font-bold">₹{gstData.totals.totalGst?.toFixed(2)}</div></div>
            <div><span className="text-xs text-gray-500">CGST + SGST</span><div className="text-lg font-bold">₹{gstData.totals.cgst?.toFixed(2)} + ₹{gstData.totals.sgst?.toFixed(2)}</div></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="px-3 py-2 text-left">Order</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-left">HSN</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Taxable</th>
                <th className="px-3 py-2 text-right">GST%</th><th className="px-3 py-2 text-right">CGST</th><th className="px-3 py-2 text-right">SGST</th>
              </tr></thead>
              <tbody>
                {gstData.rows.slice(0, 100).map((r, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{r.orderNumber}</td>
                    <td className="px-3 py-2">{r.date}</td>
                    <td className="px-3 py-2 truncate max-w-[200px]">{r.productName}</td>
                    <td className="px-3 py-2">{r.hsnCode || '—'}</td>
                    <td className="px-3 py-2 text-right">{r.quantity}</td>
                    <td className="px-3 py-2 text-right">₹{r.taxableValue.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{r.gstRate}%</td>
                    <td className="px-3 py-2 text-right">₹{r.cgst.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">₹{r.sgst.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'tds' && tdsData ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-3 gap-4 p-4 border-b bg-gray-50">
            <div><span className="text-xs text-gray-500">Gross Payouts</span><div className="text-lg font-bold">₹{tdsData.totals.grossAmount?.toFixed(2)}</div></div>
            <div><span className="text-xs text-gray-500">TDS Deducted</span><div className="text-lg font-bold text-red-600">₹{tdsData.totals.tdsAmount?.toFixed(2)}</div></div>
            <div><span className="text-xs text-gray-500">Net Payable</span><div className="text-lg font-bold text-green-700">₹{tdsData.totals.netAmount?.toFixed(2)}</div></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Seller</th><th className="px-3 py-2 text-left">PAN</th>
                <th className="px-3 py-2 text-right">Gross</th><th className="px-3 py-2 text-right">TDS</th><th className="px-3 py-2 text-right">Net</th>
                <th className="px-3 py-2 text-center">Status</th>
              </tr></thead>
              <tbody>
                {tdsData.rows.slice(0, 100).map((r, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">{r.date}</td>
                    <td className="px-3 py-2">{r.sellerName}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.pan || '—'}</td>
                    <td className="px-3 py-2 text-right">₹{r.grossAmount.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-red-600">₹{r.tdsAmount.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-medium">₹{r.netAmount.toFixed(2)}</td>
                    <td className="px-3 py-2 text-center"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'refunds' ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="px-3 py-2 text-left">Order</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Customer</th>
                <th className="px-3 py-2 text-left">Reason</th><th className="px-3 py-2 text-right">Refund</th><th className="px-3 py-2 text-center">Status</th>
              </tr></thead>
              <tbody>
                {refundData.slice(0, 100).map((r, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{r.orderNumber}</td>
                    <td className="px-3 py-2">{r.date}</td>
                    <td className="px-3 py-2">{r.customerName}</td>
                    <td className="px-3 py-2 truncate max-w-[200px]">{r.reason}</td>
                    <td className="px-3 py-2 text-right">₹{r.refundAmount.toFixed(2)}</td>
                    <td className="px-3 py-2 text-center"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
