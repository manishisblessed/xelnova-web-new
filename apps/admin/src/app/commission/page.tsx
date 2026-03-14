'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  ToggleLeft,
  Layers,
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  Eye,
} from 'lucide-react';
import { commissionRules, type CommissionRule } from '@/lib/mock-data';

function getStatusClasses(status: CommissionRule['status']) {
  switch (status) {
    case 'Active':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'Inactive':
      return 'bg-gray-100 text-gray-500 ring-1 ring-gray-200';
  }
}

function getTypeClasses(type: CommissionRule['type']) {
  switch (type) {
    case 'Percentage':
      return 'bg-amber-50 text-[#D4AF37] ring-1 ring-amber-200';
    case 'Fixed':
      return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
  }
}

const totalEarned = commissionRules.reduce((s, r) => s + r.earned, 0);
const activeRules = commissionRules.filter((r) => r.status === 'Active').length;
const categoriesCovered = commissionRules.filter((r) => r.status === 'Active' && r.category !== 'Default').length;

const statsCards = [
  {
    label: 'Total Earned',
    value: `$${totalEarned.toLocaleString()}`,
    icon: <DollarSign size={18} />,
    stripe: 'bg-[#D4AF37]',
    iconBg: 'bg-amber-50 text-[#D4AF37]',
  },
  {
    label: 'Active Rules',
    value: activeRules.toString(),
    icon: <ToggleLeft size={18} />,
    stripe: 'bg-emerald-500',
    iconBg: 'bg-emerald-50 text-emerald-600',
  },
  {
    label: 'Categories Covered',
    value: categoriesCovered.toString(),
    icon: <Layers size={18} />,
    stripe: 'bg-blue-500',
    iconBg: 'bg-blue-50 text-blue-600',
  },
];

export default function CommissionPage() {
  const [actionMenu, setActionMenu] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-900">Commission Rules</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Configure commission rates for each product category
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-amber-500 hover:to-amber-600 hover:shadow-md">
          <Plus size={15} />
          Add Rule
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="bg-gray-50/80 px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Category</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Rate</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Type</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Min Order</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Applied To</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Earned</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="bg-gray-50/80 px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {commissionRules.map((rule) => (
                <tr key={rule.id} className="group transition-colors hover:bg-gray-50/50">
                  <td className="px-6 py-3.5">
                    <span className="text-sm font-medium text-gray-900">{rule.category}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-semibold text-gray-900">
                      {rule.type === 'Percentage' ? `${rule.rate}%` : `$${rule.rate}`}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${getTypeClasses(rule.type)}`}>
                      {rule.type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-500">
                    {rule.minOrder === 0 ? (
                      <span className="text-gray-300">None</span>
                    ) : (
                      `$${rule.minOrder.toLocaleString()}`
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                      {rule.appliedTo.toLocaleString()} products
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-semibold text-gray-900">
                      ${rule.earned.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusClasses(rule.status)}`}>
                      {rule.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setActionMenu(actionMenu === rule.id ? null : rule.id)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      >
                        <MoreVertical size={15} />
                      </button>
                      <AnimatePresence>
                        {actionMenu === rule.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.97 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
                          >
                            <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                              <Eye size={14} /> View Details
                            </button>
                            <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                              <Pencil size={14} /> Edit Rule
                            </button>
                            <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-red-500 transition-colors hover:bg-red-50">
                              <Trash2 size={14} /> Delete Rule
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3.5">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-700">{commissionRules.length}</span> commission rules
          </p>
          <p className="text-sm text-gray-500">
            Total commission earned: <span className="font-semibold text-[#D4AF37]">${totalEarned.toLocaleString()}</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
