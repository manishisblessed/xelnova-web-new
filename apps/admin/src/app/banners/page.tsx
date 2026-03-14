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
  Image,
  MousePointerClick,
  BarChart3,
  Monitor,
} from 'lucide-react';
import { banners, type Banner } from '@/lib/mock-data';

const positions = ['All', 'Hero', 'Sidebar', 'Footer', 'Category'];
const statuses = ['All', 'Active', 'Inactive', 'Scheduled'];

function getStatusClasses(status: Banner['status']) {
  switch (status) {
    case 'Active':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'Inactive':
      return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    case 'Scheduled':
      return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
  }
}

function getPositionClasses(position: Banner['position']) {
  switch (position) {
    case 'Hero':
      return 'bg-amber-50 text-[#D4AF37] ring-1 ring-amber-200';
    case 'Sidebar':
      return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
    case 'Footer':
      return 'bg-gray-100 text-gray-600 ring-1 ring-gray-200';
    case 'Category':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  }
}

export default function BannersPage() {
  const [search, setSearch] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const perPage = 5;

  const filtered = banners.filter((b) => {
    const matchSearch = b.title.toLowerCase().includes(search.toLowerCase());
    const matchPos = selectedPosition === 'All' || b.position === selectedPosition;
    const matchStatus = selectedStatus === 'All' || b.status === selectedStatus;
    return matchSearch && matchPos && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const activeCount = banners.filter((b) => b.status === 'Active').length;
  const totalClicks = banners.reduce((sum, b) => sum + b.clicks, 0);
  const totalImpressions = banners.reduce((sum, b) => sum + b.impressions, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-900">Banners</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Manage promotional banners &middot; <span className="text-gray-700">{banners.length} total</span>
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-amber-500 hover:to-amber-600 hover:shadow-md">
          <Plus size={15} />
          Create Banner
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <motion.div
          whileHover={{ y: -2 }}
          className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-[#D4AF37]" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Image size={18} className="text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{banners.length}</p>
              <p className="text-xs text-gray-500">Total Banners</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          whileHover={{ y: -2 }}
          className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <Monitor size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{activeCount}</p>
              <p className="text-xs text-gray-500">Active</p>
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
              <MousePointerClick size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{totalClicks.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total Clicks</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          whileHover={{ y: -2 }}
          className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-purple-500" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
              <BarChart3 size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{totalImpressions.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total Impressions</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search banners..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/10"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-gray-400" />
          <select
            value={selectedPosition}
            onChange={(e) => { setSelectedPosition(e.target.value); setCurrentPage(1); }}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition-colors focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/10"
          >
            {positions.map((p) => (
              <option key={p} value={p}>{p === 'All' ? 'All Positions' : p}</option>
            ))}
          </select>
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
                <th className="bg-gray-50/80 px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Banner</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Position</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Clicks</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Impressions</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">CTR</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Duration</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((banner) => {
                const ctr = banner.impressions > 0
                  ? ((banner.clicks / banner.impressions) * 100).toFixed(2)
                  : '0.00';
                return (
                  <tr key={banner.id} className="group transition-colors hover:bg-gray-50/50">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-lg ring-1 ring-gray-200">
                          {banner.image}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{banner.title}</p>
                          <p className="text-[11px] text-gray-400">{banner.link}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${getPositionClasses(banner.position)}`}>
                        {banner.position}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">
                      {banner.clicks.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {banner.impressions.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${parseFloat(ctr) > 10 ? 'text-emerald-600' : parseFloat(ctr) > 5 ? 'text-amber-600' : 'text-gray-600'}`}>
                          {ctr}%
                        </span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${parseFloat(ctr) > 10 ? 'bg-emerald-400' : parseFloat(ctr) > 5 ? 'bg-amber-400' : 'bg-gray-300'}`}
                            style={{ width: `${Math.min(parseFloat(ctr) * 4, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusClasses(banner.status)}`}>
                        {banner.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-xs text-gray-600">{banner.startDate}</div>
                      <div className="text-[10px] text-gray-400">to {banner.endDate}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionMenu(actionMenu === banner.id ? null : banner.id)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                        >
                          <MoreVertical size={15} />
                        </button>
                        <AnimatePresence>
                          {actionMenu === banner.id && (
                            <motion.div
                              initial={{ opacity: 0, y: 4, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.97 }}
                              transition={{ duration: 0.12 }}
                              className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
                            >
                              <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                                <Eye size={14} /> Preview
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
                    <Image size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-500">No banners found matching your criteria.</p>
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
            <span className="font-medium text-gray-700">{filtered.length}</span> banners
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
