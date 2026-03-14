'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  CheckCircle,
  XCircle,
  DollarSign,
  Clock,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Banknote,
} from 'lucide-react';
import { payoutRequests, type PayoutRequest } from '@/lib/mock-data';

const statusFilters = ['All', 'Pending', 'Approved', 'Paid', 'Rejected'];

function getStatusClasses(status: PayoutRequest['status']) {
  switch (status) {
    case 'Paid':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'Approved':
      return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
    case 'Pending':
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    case 'Rejected':
      return 'bg-red-50 text-red-700 ring-1 ring-red-200';
  }
}

const payoutStats = {
  totalRequested: payoutRequests.reduce((s, p) => s + p.amount, 0),
  pending: payoutRequests.filter((p) => p.status === 'Pending').reduce((s, p) => s + p.amount, 0),
  approved: payoutRequests.filter((p) => p.status === 'Approved').reduce((s, p) => s + p.amount, 0),
  paid: payoutRequests.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0),
};

const statsCards = [
  {
    label: 'Total Requested',
    value: `$${payoutStats.totalRequested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    icon: <DollarSign size={18} />,
    stripe: 'bg-[#D4AF37]',
    iconBg: 'bg-amber-50 text-[#D4AF37]',
  },
  {
    label: 'Pending',
    value: `$${payoutStats.pending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    icon: <Clock size={18} />,
    stripe: 'bg-amber-500',
    iconBg: 'bg-amber-50 text-amber-600',
  },
  {
    label: 'Approved',
    value: `$${payoutStats.approved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    icon: <CheckCircle size={18} />,
    stripe: 'bg-blue-500',
    iconBg: 'bg-blue-50 text-blue-600',
  },
  {
    label: 'Paid',
    value: `$${payoutStats.paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    icon: <CreditCard size={18} />,
    stripe: 'bg-emerald-500',
    iconBg: 'bg-emerald-50 text-emerald-600',
  },
];

const avatarColors = [
  'from-[#D4AF37] to-amber-600',
  'from-blue-400 to-blue-600',
  'from-emerald-400 to-emerald-600',
  'from-purple-400 to-purple-600',
  'from-pink-400 to-pink-600',
  'from-red-400 to-red-600',
];

export default function PayoutsPage() {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 5;

  const filtered = payoutRequests.filter((p) => {
    const matchSearch =
      p.seller.toLowerCase().includes(search.toLowerCase()) ||
      p.business.toLowerCase().includes(search.toLowerCase());
    const matchStatus = selectedStatus === 'All' || p.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-900">Payouts</h1>
          <p className="mt-0.5 text-sm text-gray-500">Manage and process seller payout requests</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-amber-500 hover:to-amber-600 hover:shadow-md">
          <Banknote size={15} />
          Process Payouts
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsCards.map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className={`absolute inset-x-0 top-0 h-1 ${stat.stripe}`} />
            <div className="flex items-center gap-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-[13px] text-gray-500">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by seller name or business..."
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
            {statusFilters.map((s) => (
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
                <th className="bg-gray-50/80 px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Seller</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Requested</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Paid</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Method</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <AnimatePresence mode="popLayout">
                {paginated.map((payout) => (
                  <motion.tr
                    key={payout.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="group transition-colors hover:bg-gray-50/50"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${avatarColors[payout.id % avatarColors.length]} text-[10px] font-bold text-white shadow-sm`}>
                          {payout.seller.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{payout.seller}</p>
                          <p className="text-[11px] text-gray-500">{payout.business}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">
                      ${payout.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusClasses(payout.status)}`}>
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">{payout.requestedAt}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {payout.paidAt ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        {payout.method}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        {payout.status === 'Pending' && (
                          <>
                            <button
                              className="rounded-lg p-1.5 text-emerald-500 transition-all hover:bg-emerald-50 hover:scale-110"
                              title="Approve"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              className="rounded-lg p-1.5 text-red-500 transition-all hover:bg-red-50 hover:scale-110"
                              title="Reject"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        {payout.status === 'Approved' && (
                          <button
                            className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-[#D4AF37] transition-all hover:bg-amber-100"
                            title="Process Payment"
                          >
                            Pay <ArrowRight size={12} />
                          </button>
                        )}
                        {(payout.status === 'Paid' || payout.status === 'Rejected') && (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3.5">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-700">{filtered.length === 0 ? 0 : (currentPage - 1) * perPage + 1}</span>
            –<span className="font-medium text-gray-700">{Math.min(currentPage * perPage, filtered.length)}</span> of{' '}
            <span className="font-medium text-gray-700">{filtered.length}</span> payouts
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
