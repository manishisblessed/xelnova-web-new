'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { revenueData, revenueByChannel, topCategories } from '@/lib/mock-data';

const timeFilters = ['Last 12 Months', 'Last 6 Months', 'Last 3 Months', 'This Month'];

const statsCards = [
  {
    label: 'Total Revenue',
    value: '$384,520',
    change: 12.5,
    icon: <DollarSign size={18} />,
    stripe: 'bg-[#D4AF37]',
    iconBg: 'bg-amber-50 text-[#D4AF37]',
  },
  {
    label: 'Net Profit',
    value: '$178,230',
    change: 8.3,
    icon: <TrendingUp size={18} />,
    stripe: 'bg-emerald-500',
    iconBg: 'bg-emerald-50 text-emerald-600',
  },
  {
    label: 'Avg Order Value',
    value: '$98.50',
    change: 3.2,
    icon: <ShoppingCart size={18} />,
    stripe: 'bg-blue-500',
    iconBg: 'bg-blue-50 text-blue-600',
  },
  {
    label: 'Conversion Rate',
    value: '7.7%',
    change: -0.4,
    icon: <Target size={18} />,
    stripe: 'bg-purple-500',
    iconBg: 'bg-purple-50 text-purple-600',
  },
];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="mb-1.5 text-xs font-medium text-gray-500">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm font-semibold text-gray-900">
          {entry.dataKey === 'revenue' ? 'Revenue' : 'Expenses'}: ${entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export default function RevenuePage() {
  const [timeFilter, setTimeFilter] = useState(timeFilters[0]);
  const [showDropdown, setShowDropdown] = useState(false);

  const totalChannelRevenue = revenueByChannel.reduce((sum, c) => sum + c.revenue, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold font-display text-gray-900">Revenue Analytics</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Track revenue performance, channels, and category breakdowns
        </p>
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
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[13px] text-gray-500">{stat.label}</p>
                  <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${stat.change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {stat.change >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                    {Math.abs(stat.change)}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold font-display text-gray-900">Revenue & Expenses</h2>
            <p className="mt-0.5 text-xs text-gray-500">Monthly revenue vs expenses overview</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              {timeFilter}
              <ChevronDown size={14} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
              >
                {timeFilters.map((f) => (
                  <button
                    key={f}
                    onClick={() => { setTimeFilter(f); setShowDropdown(false); }}
                    className={`flex w-full items-center px-3.5 py-2 text-sm transition-colors hover:bg-gray-50 ${f === timeFilter ? 'text-[#D4AF37] font-medium' : 'text-gray-600'}`}
                  >
                    {f}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>
        <div className="px-6 py-5">
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#D4AF37"
                strokeWidth={2.5}
                fill="url(#revenueGrad)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#expenseGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-[#D4AF37]" />
              <span className="text-xs text-gray-500">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-500">Expenses</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold font-display text-gray-900">Revenue by Channel</h2>
            <p className="mt-0.5 text-xs text-gray-500">Performance across sales channels</p>
          </div>
          <div className="space-y-5 p-6">
            {revenueByChannel.map((channel, idx) => {
              const colors = ['bg-[#D4AF37]', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500'];
              const textColors = ['text-[#D4AF37]', 'text-blue-600', 'text-emerald-600', 'text-purple-600'];
              return (
                <div key={channel.channel}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-2.5 w-2.5 rounded-full ${colors[idx]}`} />
                      <span className="text-sm font-medium text-gray-900">{channel.channel}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-gray-900">
                        ${channel.revenue.toLocaleString()}
                      </span>
                      <span className={`text-xs font-medium ${textColors[idx]}`}>
                        {channel.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(channel.revenue / totalChannelRevenue) * 100}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.1 }}
                      className={`h-full rounded-full ${colors[idx]}`}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">
                    {channel.orders.toLocaleString()} orders
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold font-display text-gray-900">Top Categories by Revenue</h2>
            <p className="mt-0.5 text-xs text-gray-500">Revenue share across product categories</p>
          </div>
          <div className="space-y-4 p-6">
            {topCategories.map((cat, idx) => (
              <div key={cat.name}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">
                      ${cat.revenue.toLocaleString()}
                    </span>
                    <span className="w-12 text-right text-xs font-medium text-gray-500">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.percentage}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.08 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}

            <div className="mt-2 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Total Revenue</span>
                <span className="text-sm font-bold text-gray-900">
                  ${topCategories.reduce((s, c) => s + c.revenue, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
