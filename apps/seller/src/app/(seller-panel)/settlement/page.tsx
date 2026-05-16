'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Calendar, IndianRupee, FileDown, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import {
  apiGetSettlement,
  apiDownloadSettlementCsv,
  apiDownloadCustomerInvoice,
  apiDownloadMonthlyInvoices,
} from '@/lib/api';

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
  courierDeduction: number;
  xelgoServiceFee: number;
  reverseCourierDeduction: number;
  returnXelgoFee: number;
  shippingMode: string;
  net: number;
  orderStatus: string;
  paymentMethod: string;
  commissionWaived?: boolean;
};

type SettlementReport = {
  rows: SettlementRow[];
  totals: {
    gross: number;
    commission: number;
    courierDeduction: number;
    xelgoServiceFee: number;
    reverseCourierDeduction: number;
    returnXelgoFee: number;
    net: number;
  };
  commissionRate: number;
};

export default function SettlementPage() {
  const [report, setReport] = useState<SettlementReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const today = new Date();
  const [billYear, setBillYear] = useState<number>(today.getFullYear());
  const [billMonth, setBillMonth] = useState<number>(today.getMonth() + 1);
  const [downloadingMonthly, setDownloadingMonthly] = useState(false);
  const [downloadingOrder, setDownloadingOrder] = useState<string | null>(null);

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

  const handleDownloadMonthlyBills = async () => {
    try {
      setDownloadingMonthly(true);
      await apiDownloadMonthlyInvoices({ year: billYear, month: billMonth });
      toast.success(`Monthly invoices for ${String(billMonth).padStart(2, '0')}/${billYear} downloaded`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to download monthly invoices');
    } finally {
      setDownloadingMonthly(false);
    }
  };

  const handleDownloadSingleBill = async (orderNumber: string) => {
    try {
      setDownloadingOrder(orderNumber);
      await apiDownloadCustomerInvoice(orderNumber);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to download invoice');
    } finally {
      setDownloadingOrder(null);
    }
  };

  const monthOptions = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const yearOptions = (() => {
    const y = today.getFullYear();
    return [y - 2, y - 1, y, y + 1];
  })();

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

        {/* Monthly invoice bills downloader (testing observation #23) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-0.5">Monthly invoice bills</div>
              <div className="text-xs text-gray-500">Download every customer invoice for a calendar month as a single PDF, or use the
                row icons below to grab a single bill.</div>
            </div>
            <div className="ml-auto flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Month</label>
                <select
                  value={billMonth}
                  onChange={(e) => setBillMonth(parseInt(e.target.value, 10))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  {monthOptions.map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
                <select
                  value={billYear}
                  onChange={(e) => setBillYear(parseInt(e.target.value, 10))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleDownloadMonthlyBills}
                disabled={downloadingMonthly}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <FileDown size={16} />
                {downloadingMonthly ? 'Preparing PDF…' : 'Download monthly bills (PDF)'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">{error}</div>
        )}

        {report && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><IndianRupee size={16} />Gross Revenue</div>
                <div className="text-2xl font-bold text-gray-900">₹{report.totals.gross.toFixed(2)}</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <FileText size={16} />
                  Commission{report.commissionRate > 0 ? ` (avg ${report.commissionRate.toFixed(2)}%)` : ''}
                </div>
                <div className="text-2xl font-bold text-red-600">-₹{report.totals.commission.toFixed(2)}</div>
                <div className="text-[11px] text-gray-400 mt-1">
                  Per-product rate set on approval. Refunded orders are commission-free.
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Truck size={16} />
                  Courier (Xelgo)
                </div>
                <div className="text-2xl font-bold text-orange-600">-₹{report.totals.courierDeduction.toFixed(2)}</div>
                <div className="text-[11px] text-gray-400 mt-1">
                  Carrier rate (debited from wallet at booking).
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <FileText size={16} />
                  Xelgo Service Fee
                </div>
                <div className="text-2xl font-bold text-purple-600">-₹{report.totals.xelgoServiceFee.toFixed(2)}</div>
                <div className="text-[11px] text-gray-400 mt-1">
                  ₹30 flat per Xelgo shipment (deducted at settlement).
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Truck size={16} />
                  Return Deductions
                </div>
                <div className="text-2xl font-bold text-red-600">
                  -₹{(report.totals.reverseCourierDeduction + report.totals.returnXelgoFee).toFixed(2)}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  Return courier + ₹30 Xelgo fee on returned orders.
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="bg-violet-50 rounded-2xl border border-violet-200 p-5">
                <div className="flex items-center gap-2 text-violet-600 text-sm mb-1"><IndianRupee size={16} />Net Earnings</div>
                <div className="text-2xl font-bold text-violet-700">₹{report.totals.net.toFixed(2)}</div>
                <div className="text-[11px] text-violet-400 mt-1">
                  Gross − Commission − Courier − Xelgo Fee − Returns
                </div>
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
                        <th className="px-3 py-2.5 text-right font-medium text-gray-600">Courier</th>
                        <th className="px-3 py-2.5 text-right font-medium text-gray-600" title="₹30 flat per Xelgo shipment">Xelgo Fee</th>
                        <th className="px-3 py-2.5 text-right font-medium text-gray-600">Return</th>
                        <th className="px-3 py-2.5 text-right font-medium text-gray-600">Net</th>
                        <th className="px-3 py-2.5 text-center font-medium text-gray-600">Status</th>
                        <th className="px-3 py-2.5 text-center font-medium text-gray-600">Bill</th>
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
                          <td className={`px-3 py-2 text-right ${r.commissionWaived ? 'text-emerald-600' : 'text-red-600'}`}>
                            {r.commissionWaived ? (
                              <span title="Commission waived because the order was refunded">₹0.00 (waived)</span>
                            ) : (
                              <span title={`Per-product rate ${r.commissionPercent}%`}>
                                -₹{r.commission.toFixed(2)}
                                <span className="text-[10px] text-gray-400 ml-1">({r.commissionPercent}%)</span>
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {r.courierDeduction > 0 ? (
                              <span className="text-orange-600" title={`Shipped via ${r.shippingMode === 'XELNOVA_COURIER' ? 'Xelgo' : 'Self Ship'}`}>
                                -₹{r.courierDeduction.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {r.xelgoServiceFee > 0 ? (
                              <span className="text-purple-600" title="₹30 flat platform service fee for Xelgo shipments">
                                -₹{r.xelgoServiceFee.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {(r.reverseCourierDeduction + r.returnXelgoFee) > 0 ? (
                              <span className="text-red-600" title="Return courier charge + ₹30 Xelgo fee">
                                -₹{(r.reverseCourierDeduction + r.returnXelgoFee).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">₹{r.net.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                r.commissionWaived
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {r.orderStatus}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => handleDownloadSingleBill(r.orderNumber)}
                              disabled={downloadingOrder === r.orderNumber}
                              title="Download invoice for this order"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            >
                              <FileDown size={14} />
                            </button>
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
