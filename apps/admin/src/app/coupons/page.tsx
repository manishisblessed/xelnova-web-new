'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  SlidersHorizontal,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Ticket,
  TrendingUp,
  DollarSign,
  Copy,
} from 'lucide-react';
import { coupons, type Coupon } from '@/lib/mock-data';

const statuses = ['All', 'Active', 'Expired', 'Disabled'];

function getStatusClasses(status: Coupon['status']) {
  switch (status) {
    case 'Active':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'Expired':
      return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    case 'Disabled':
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  }
}

function getUsagePercent(used: number, limit: number) {
  if (limit === 0) return 100;
  return Math.min((used / limit) * 100, 100);
}

function getProgressColor(percent: number) {
  if (percent >= 90) return 'bg-red-400';
  if (percent >= 60) return 'bg-amber-400';
  return 'bg-emerald-400';
}

export default function CouponsPage() {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const perPage = 5;

  const filtered = coupons.filter((c) => {
    const matchSearch = c.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = selectedStatus === 'All' || c.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const activeCount = coupons.filter((c) => c.status === 'Active').length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + c.used, 0);
  const totalSaved = coupons.reduce((sum, c) => {
    if (c.type === 'Fixed') return sum + c.value * c.used;
    return sum + (c.maxDiscount ?? c.value) * c.used * 0.4;
  }, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-900">Coupons</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Manage discount coupons &middot; <span className="text-gray-700">{coupons.length} total</span>
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-amber-500 hover:to-amber-600 hover:shadow-md">
          <Plus size={15} />
          Create Coupon
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <motion.div
          whileHover={{ y: -2 }}
          className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <Ticket size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{activeCount}</p>
              <p className="text-xs text-gray-500">Active Coupons</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          whileHover={{ y: -2 }}
          className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-blue-500" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <TrendingUp size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{totalRedemptions.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total Redemptions</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          whileHover={{ y: -2 }}
          className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-[#D4AF37]" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <DollarSign size={18} className="text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">${(totalSaved / 1000).toFixed(1)}k</p>
              <p className="text-xs text-gray-500">Revenue Saved</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by coupon code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/10"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-gray-400" />
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition-colors focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/10"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="bg-gray-50/80 px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Code</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Type</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Value</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Min Order</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Usage</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Valid Period</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((coupon) => {
                const usagePercent = getUsagePercent(coupon.used, coupon.limit);
                return (
                  <tr key={coupon.id} className="group transition-colors hover:bg-gray-50/50">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <code className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs font-medium text-gray-800">
                          {coupon.code}
                        </code>
                        <button className="rounded-md p-1 text-gray-300 opacity-0 transition-all hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100">
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                        {coupon.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">
                      {coupon.type === 'Percentage' ? `${coupon.value}%` : `$${coupon.value}`}
                      {coupon.maxDiscount !== null && (
                        <span className="ml-1 text-[10px] font-normal text-gray-400">
                          (max ${coupon.maxDiscount})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {coupon.minOrder > 0 ? `$${coupon.minOrder}` : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="w-32">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-700">{coupon.used.toLocaleString()}</span>
                          <span className="text-gray-400">
                            {coupon.limit > 0 ? coupon.limit.toLocaleString() : '∞'}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full transition-all ${getProgressColor(usagePercent)}`}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusClasses(coupon.status)}`}>
                        {coupon.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-xs text-gray-600">
                        {coupon.validFrom}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        to {coupon.validTo}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionMenu(actionMenu === coupon.id ? null : coupon.id)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                        >
                          <MoreVertical size={15} />
                        </button>
                        <AnimatePresence>
                          {actionMenu === coupon.id && (
                            <motion.div
                              initial={{ opacity: 0, y: 4, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.97 }}
                              transition={{ duration: 0.12 }}
                              className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
                            >
                              <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                                <Eye size={14} /> View
                              </button>
                              <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                                <Edit size={14} /> Edit
                              </button>
                              <div className="mx-3 my-0.5 border-t border-gray-100" />
                              <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-red-500 transition-colors hover:bg-red-50">
                                <Trash2 size={14} /> Delete
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Ticket size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-500">No coupons found matching your criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3.5">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-700">{filtered.length === 0 ? 0 : (currentPage - 1) * perPage + 1}</span>
            –<span className="font-medium text-gray-700">{Math.min(currentPage * perPage, filtered.length)}</span> of{' '}
            <span className="font-medium text-gray-700">{filtered.length}</span> coupons
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`h-8 w-8 rounded-lg text-sm font-medium transition-all ${
                  page === currentPage
                    ? 'bg-[#D4AF37] text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
