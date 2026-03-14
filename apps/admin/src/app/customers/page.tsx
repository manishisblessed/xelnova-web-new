'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  MoreVertical,
  Eye,
  Mail,
  Ban,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  DollarSign,
  Download,
  ShoppingBag,
} from 'lucide-react';
import { customers, type Customer } from '@/lib/mock-data';

const statusFilters = ['All', 'Active', 'Inactive', 'Blocked'];

const avatarGradients = [
  'from-blue-400 to-blue-600',
  'from-emerald-400 to-emerald-600',
  'from-violet-400 to-violet-600',
  'from-rose-400 to-rose-600',
  'from-amber-400 to-amber-600',
  'from-cyan-400 to-cyan-600',
];

function getStatusBadge(status: Customer['status']) {
  switch (status) {
    case 'Active':
      return 'badge badge-success';
    case 'Inactive':
      return 'badge badge-danger';
    case 'Blocked':
      return 'badge badge-danger';
  }
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const perPage = 6;

  const filtered = customers.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = selectedStatus === 'All' || c.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status === 'Active').length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const totalOrders = customers.reduce((sum, c) => sum + c.orders, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-heading">Customers</h1>
          <p className="mt-1 text-sm text-muted">Manage registered marketplace customers</p>
        </div>
        <button className="btn-secondary flex items-center gap-2">
          <Download size={15} />
          Export
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="stat-stripe-gold" />
          <div className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
              <Users size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-heading">{totalCustomers.toLocaleString()}</p>
              <p className="text-xs text-muted">Total Customers</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="stat-stripe-green" />
          <div className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
              <UserCheck size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-heading">{activeCustomers}</p>
              <p className="text-xs text-muted">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="stat-stripe-blue" />
          <div className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <ShoppingBag size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-heading">{totalOrders}</p>
              <p className="text-xs text-muted">Total Orders</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="stat-stripe-purple" />
          <div className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50">
              <DollarSign size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-heading">
                ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted">Total Revenue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search customers by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="input-field w-full pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-muted" />
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            className="input-field"
          >
            {statusFilters.map((s) => (
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Joined</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((customer, idx) => (
                <tr key={customer.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradients[customer.id % avatarGradients.length]} text-[10px] font-bold text-white shadow-sm`}>
                        {customer.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-heading">{customer.name}</p>
                        <p className="text-[11px] text-muted">{customer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-body">{customer.phone}</td>
                  <td>
                    <span className="badge badge-neutral">{customer.orders}</span>
                  </td>
                  <td className="font-semibold text-heading">
                    ${customer.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-sm text-muted">{customer.joined}</td>
                  <td>
                    <span className={getStatusBadge(customer.status)}>{customer.status}</span>
                  </td>
                  <td className="text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setActionMenu(actionMenu === customer.id ? null : customer.id)}
                        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-gray-100 hover:text-heading"
                      >
                        <MoreVertical size={15} />
                      </button>
                      <AnimatePresence>
                        {actionMenu === customer.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.97 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-border bg-white shadow-lg"
                          >
                            <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-body transition-colors hover:bg-gray-50 hover:text-heading">
                              <Eye size={14} /> View Profile
                            </button>
                            <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-body transition-colors hover:bg-gray-50 hover:text-heading">
                              <Mail size={14} /> Send Email
                            </button>
                            <div className="mx-3 my-0.5 border-t border-border" />
                            {customer.status !== 'Blocked' ? (
                              <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 transition-colors hover:bg-red-50">
                                <Ban size={14} /> Block
                              </button>
                            ) : (
                              <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-green-600 transition-colors hover:bg-green-50">
                                <Ban size={14} /> Unblock
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Users size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-muted">No customers found matching your criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-6 py-3.5">
          <p className="text-sm text-muted">
            Showing <span className="font-medium text-heading">{(currentPage - 1) * perPage + 1}</span>
            &ndash;<span className="font-medium text-heading">{Math.min(currentPage * perPage, filtered.length)}</span> of{' '}
            <span className="font-medium text-heading">{filtered.length}</span> customers
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-gray-100 hover:text-heading disabled:opacity-30"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`h-8 w-8 rounded-lg text-sm font-medium transition-all ${
                  page === currentPage
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-muted hover:bg-gray-100 hover:text-heading'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-gray-100 hover:text-heading disabled:opacity-30"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
