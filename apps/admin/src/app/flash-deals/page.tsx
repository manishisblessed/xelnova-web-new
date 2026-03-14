'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Zap,
  Clock,
  TrendingUp,
  ShoppingBag,
  CalendarClock,
  Flame,
} from 'lucide-react';
import { flashDeals, type FlashDeal } from '@/lib/mock-data';

function getStatusClasses(status: FlashDeal['status']) {
  switch (status) {
    case 'Active':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'Upcoming':
      return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
    case 'Expired':
      return 'bg-red-50 text-red-700 ring-1 ring-red-200';
  }
}

function getStatusIcon(status: FlashDeal['status']) {
  switch (status) {
    case 'Active':
      return <Zap size={12} />;
    case 'Upcoming':
      return <Clock size={12} />;
    case 'Expired':
      return <CalendarClock size={12} />;
  }
}

function getProgressColor(percent: number) {
  if (percent >= 100) return 'from-emerald-400 to-emerald-500';
  if (percent >= 60) return 'from-amber-400 to-amber-500';
  return 'from-[#D4AF37] to-amber-500';
}

export default function FlashDealsPage() {
  const [filter, setFilter] = useState<'All' | FlashDeal['status']>('All');

  const filtered = filter === 'All' ? flashDeals : flashDeals.filter((d) => d.status === filter);

  const activeCount = flashDeals.filter((d) => d.status === 'Active').length;
  const upcomingCount = flashDeals.filter((d) => d.status === 'Upcoming').length;
  const totalSold = flashDeals.reduce((sum, d) => sum + d.sold, 0);

  const filterOptions: ('All' | FlashDeal['status'])[] = ['All', 'Active', 'Upcoming', 'Expired'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-900">Flash Deals</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Manage limited-time offers &middot; <span className="text-gray-700">{flashDeals.length} total</span>
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-amber-500 hover:to-amber-600 hover:shadow-md">
          <Plus size={15} />
          Create Flash Deal
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
              <Zap size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{activeCount}</p>
              <p className="text-xs text-gray-500">Active Deals</p>
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
              <Clock size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{upcomingCount}</p>
              <p className="text-xs text-gray-500">Upcoming</p>
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
              <ShoppingBag size={18} className="text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{totalSold.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total Sold</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex items-center gap-2">
        {filterOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setFilter(opt)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              filter === opt
                ? 'bg-[#D4AF37] text-white shadow-sm'
                : 'border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((deal, i) => {
          const soldPercent = deal.target > 0 ? Math.min((deal.sold / deal.target) * 100, 100) : 0;
          return (
            <motion.div
              key={deal.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              whileHover={{ y: -4 }}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              {deal.status === 'Active' && (
                <div className="absolute right-4 top-4">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                  </span>
                </div>
              )}

              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Flame size={18} className="text-[#D4AF37]" />
                    <h3 className="text-lg font-bold font-display text-gray-900">{deal.title}</h3>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{deal.products} products</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusClasses(deal.status)}`}>
                  {getStatusIcon(deal.status)}
                  {deal.status}
                </span>
              </div>

              <div className="mb-4 flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 py-6 ring-1 ring-amber-100">
                <div className="text-center">
                  <p className="text-4xl font-black font-display text-[#D4AF37]">{deal.discount}%</p>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#D4AF37]/60">Discount</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-gray-700">
                    {deal.sold.toLocaleString()} sold
                  </span>
                  <span className="text-gray-400">
                    Target: {deal.target.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${soldPercent}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                    className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(soldPercent)}`}
                  />
                </div>
                <p className="mt-1 text-right text-[10px] text-gray-400">
                  {soldPercent.toFixed(0)}% of target
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-100">
                <Clock size={12} className="text-gray-400" />
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500">
                    {deal.startDate}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    to {deal.endDate}
                  </p>
                </div>
                {deal.status === 'Active' && (
                  <TrendingUp size={14} className="text-emerald-500" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <Zap size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">No flash deals found for this filter.</p>
        </div>
      )}
    </motion.div>
  );
}
