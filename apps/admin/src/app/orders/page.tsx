'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  MoreVertical,
  Eye,
  Printer,
  ShoppingCart,
  Clock,
  Truck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import { orders, orderStats, type Order } from '@/lib/mock-data';

const statusFilters = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

const avatarGradients = [
  'from-blue-400 to-blue-600',
  'from-emerald-400 to-emerald-600',
  'from-violet-400 to-violet-600',
  'from-rose-400 to-rose-600',
  'from-amber-400 to-amber-600',
  'from-cyan-400 to-cyan-600',
];

function getStatusBadge(status: Order['status']) {
  switch (status) {
    case 'Delivered':
      return 'badge badge-success';
    case 'Processing':
    case 'Shipped':
      return 'badge badge-info';
    case 'Pending':
      return 'badge badge-warning';
    case 'Cancelled':
      return 'badge badge-danger';
  }
}

function getPaymentBadge(payment: Order['payment']) {
  switch (payment) {
    case 'Paid':
      return 'badge badge-success';
    case 'Pending':
      return 'badge badge-warning';
    case 'Refunded':
      return 'badge badge-danger';
  }
}

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const perPage = 5;

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.customer.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = selectedStatus === 'All' || o.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

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
          <h1 className="text-2xl font-bold font-display text-heading">Orders</h1>
          <p className="mt-1 text-sm text-muted">Track and manage marketplace orders</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-secondary flex items-center gap-2"
        >
          <Download size={15} />
          Export
        </motion.button>
      </div>

      {/* Stat Cards */}
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.06 } },
          hidden: {},
        }}
      >
        {[
          { stripe: 'stat-stripe-gold', icon: ShoppingCart, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', value: orderStats.total, label: 'Total Orders' },
          { stripe: 'stat-stripe-blue', icon: Clock, iconBg: 'bg-orange-50', iconColor: 'text-orange-600', value: orderStats.pending, label: 'Pending' },
          { stripe: 'stat-stripe-purple', icon: Truck, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', value: orderStats.processing, label: 'Processing' },
          { stripe: 'stat-stripe-green', icon: CheckCircle, iconBg: 'bg-green-50', iconColor: 'text-green-600', value: orderStats.delivered, label: 'Delivered' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] as const }}
              className="bg-card border border-border rounded-2xl shadow-card overflow-hidden transition-[transform,box-shadow,border-color] duration-200 ease-out hover:scale-[1.02] hover:shadow-[var(--shadow-card-hover)] hover:border-white/10"
            >
              <div className={stat.stripe} />
              <div className="flex items-center gap-3 p-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${stat.iconBg}`}>
                  <Icon size={18} className={stat.iconColor} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-heading">{stat.value.toLocaleString()}</p>
                  <p className="text-xs text-muted">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by order ID or customer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="input-field w-full pl-10 transition-all duration-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-muted" />
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            className="input-field transition-all duration-200"
          >
            {statusFilters.map((s) => (
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
            ))}
          </select>
          <input type="date" className="input-field" />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((order, idx) => (
                <motion.tr
                  key={`${order.id}-${currentPage}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: idx * 0.03, ease: [0.4, 0, 0.2, 1] as const }}
                  className="transition-colors duration-150 hover:bg-white/[0.02]"
                >
                  <td>
                    <span className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs font-medium text-heading">
                      #{order.id}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradients[idx % avatarGradients.length]} text-[10px] font-bold text-white`}>
                        {order.customer.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-heading">{order.customer}</p>
                        <p className="text-[11px] text-muted">{order.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{order.items} items</span>
                  </td>
                  <td className="font-semibold text-heading">${order.total.toFixed(2)}</td>
                  <td>
                    <span className={getStatusBadge(order.status)}>{order.status}</span>
                  </td>
                  <td>
                    <span className={getPaymentBadge(order.payment)}>{order.payment}</span>
                  </td>
                  <td className="text-sm text-muted">{order.date}</td>
                  <td className="text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setActionMenu(actionMenu === order.id ? null : order.id)}
                        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-gray-100 hover:text-heading"
                      >
                        <MoreVertical size={15} />
                      </button>
                      <AnimatePresence>
                        {actionMenu === order.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.97 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-border bg-white shadow-lg"
                          >
                            <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-body transition-colors hover:bg-gray-50 hover:text-heading">
                              <Eye size={14} /> View Details
                            </button>
                            <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-body transition-colors hover:bg-gray-50 hover:text-heading">
                              <Printer size={14} /> Print Invoice
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <ShoppingCart size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-muted">No orders found matching your criteria.</p>
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
            <span className="font-medium text-heading">{filtered.length}</span> orders
          </p>
          <div className="flex items-center gap-1">
            <motion.button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              whileHover={{ scale: currentPage === 1 ? 1 : 1.05 }}
              whileTap={{ scale: 0.96 }}
              className="rounded-lg p-2 text-muted transition-colors duration-200 hover:bg-gray-100 hover:text-heading disabled:opacity-30"
            >
              <ChevronLeft size={15} />
            </motion.button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <motion.button
                key={page}
                onClick={() => setCurrentPage(page)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  page === currentPage
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-muted hover:bg-gray-100 hover:text-heading'
                }`}
              >
                {page}
              </motion.button>
            ))}
            <motion.button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              whileHover={{ scale: currentPage === totalPages ? 1 : 1.05 }}
              whileTap={{ scale: 0.96 }}
              className="rounded-lg p-2 text-muted transition-colors duration-200 hover:bg-gray-100 hover:text-heading disabled:opacity-30"
            >
              <ChevronRight size={15} />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
