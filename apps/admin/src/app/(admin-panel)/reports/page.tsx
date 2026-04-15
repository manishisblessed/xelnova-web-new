'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Download, Calendar, TrendingUp, Package, Users, Ticket } from 'lucide-react';
import {
  apiGetGstReport, apiDownloadGstCsv,
  apiGetTdsReport, apiDownloadTdsCsv,
  apiGetRefundReport, apiDownloadRefundCsv,
  apiGetSalesReport, apiDownloadSalesCsv,
  apiGetInventoryReport, apiDownloadInventoryCsv,
  apiGetSellerPerformanceReport, apiDownloadSellerPerformanceCsv,
  apiGetCouponUsageReport, apiDownloadCouponUsageCsv,
} from '@/lib/api';

type Tab = 'sales' | 'inventory' | 'sellers' | 'coupons' | 'gst' | 'tds' | 'refunds';

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { key: 'sales', label: 'Sales', icon: TrendingUp },
  { key: 'inventory', label: 'Inventory', icon: Package },
  { key: 'sellers', label: 'Seller Performance', icon: Users },
  { key: 'coupons', label: 'Coupon Usage', icon: Ticket },
  { key: 'gst', label: 'GST', icon: FileSpreadsheet },
  { key: 'tds', label: 'TDS', icon: FileSpreadsheet },
  { key: 'refunds', label: 'Refunds', icon: FileSpreadsheet },
];

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('sales');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    const p: Record<string, string> = {};
    if (dateFrom) p.dateFrom = dateFrom;
    if (dateTo) p.dateTo = dateTo;
    setLoading(true);
    try {
      switch (tab) {
        case 'sales': setData(await apiGetSalesReport(p)); break;
        case 'inventory': setData(await apiGetInventoryReport()); break;
        case 'sellers': setData(await apiGetSellerPerformanceReport(p)); break;
        case 'coupons': setData(await apiGetCouponUsageReport(p)); break;
        case 'gst': setData(await apiGetGstReport(p)); break;
        case 'tds': setData(await apiGetTdsReport(p)); break;
        case 'refunds': setData({ rows: await apiGetRefundReport(p) }); break;
      }
    } catch { setData(null); }
    setLoading(false);
  }, [tab, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExport = () => {
    const p: Record<string, string> = {};
    if (dateFrom) p.dateFrom = dateFrom;
    if (dateTo) p.dateTo = dateTo;
    switch (tab) {
      case 'sales': apiDownloadSalesCsv(p); break;
      case 'inventory': apiDownloadInventoryCsv(); break;
      case 'sellers': apiDownloadSellerPerformanceCsv(p); break;
      case 'coupons': apiDownloadCouponUsageCsv(p); break;
      case 'gst': apiDownloadGstCsv(p); break;
      case 'tds': apiDownloadTdsCsv(p); break;
      case 'refunds': apiDownloadRefundCsv(p); break;
    }
  };

  const needsDateFilter = tab !== 'inventory';

  return (
    <div className="p-6 max-w-7xl">
      <h1 className="text-2xl font-bold mb-1">Reports</h1>
      <p className="text-sm text-gray-500 mb-6">View and download all business reports</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t.key ? 'bg-violet-600 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}>
              <Icon size={15} />{t.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        {needsDateFilter && (
          <>
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
          </>
        )}
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
          <Download size={16} />Export CSV
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : !data ? (
        <div className="text-center py-12 text-gray-400">No data available</div>
      ) : (
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Summary cards */}
          {data.totals && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 p-4 border-b bg-gray-50">
              {Object.entries(data.totals).map(([key, value]) => (
                <div key={key}>
                  <span className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className="text-lg font-bold">{typeof value === 'number' ? (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('commission') || key.toLowerCase().includes('discount') || key.toLowerCase().includes('value') || key.toLowerCase().includes('tax') || key.toLowerCase().includes('shipping') || key.toLowerCase().includes('payout') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('gross') || key.toLowerCase().includes('net') || key.toLowerCase().includes('gst') ? `₹${(value as number).toFixed(2)}` : value) : String(value)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Data table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {data.rows?.length > 0 && Object.keys(data.rows[0]).map((key) => (
                    <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.rows || []).slice(0, 200).map((row: any, i: number) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    {Object.entries(row).map(([key, value]) => (
                      <td key={key} className="px-3 py-2 whitespace-nowrap text-xs max-w-[200px] truncate">
                        {typeof value === 'boolean' ? (value ? '✓' : '✗') : typeof value === 'number' ? (key.toLowerCase().includes('price') || key.toLowerCase().includes('revenue') || key.toLowerCase().includes('total') || key.toLowerCase().includes('discount') || key.toLowerCase().includes('commission') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('payout') || key.toLowerCase().includes('gross') || key.toLowerCase().includes('net') || key.toLowerCase().includes('value') || key.toLowerCase().includes('tax') || key.toLowerCase().includes('shipping') || key.toLowerCase().includes('gst') || key.toLowerCase().includes('cgst') || key.toLowerCase().includes('sgst') ? `₹${value.toFixed(2)}` : value) : String(value ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.rows?.length > 200 && (
            <div className="p-3 text-center text-xs text-gray-400 border-t">
              Showing first 200 of {data.rows.length} rows. Export CSV for complete data.
            </div>
          )}
          {(!data.rows || data.rows.length === 0) && (
            <div className="p-12 text-center text-gray-400">No records found for the selected period</div>
          )}
        </motion.div>
      )}
    </div>
  );
}
