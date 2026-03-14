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
  Package,
  Download,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { products, type Product } from '@/lib/mock-data';

const categoryFilters = ['All', 'Electronics', 'Footwear', 'Fashion', 'Appliances', 'Kitchen'];
const statusFilters = ['All', 'Active', 'Inactive', 'Pending'];

function getStatusBadge(status: Product['status']) {
  switch (status) {
    case 'Active':
      return 'badge badge-success';
    case 'Inactive':
      return 'badge badge-danger';
    case 'Pending':
      return 'badge badge-warning';
  }
}

function getStockIndicator(stock: number) {
  if (stock === 0) return { label: 'Out of Stock', cls: 'badge badge-danger' };
  if (stock < 20) return { label: `${stock} left`, cls: 'badge badge-warning' };
  return { label: `${stock} in stock`, cls: '' };
}

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const perPage = 5;

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchStatus = selectedStatus === 'All' || p.status === selectedStatus;
    return matchSearch && matchCat && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const activeCount = products.filter((p) => p.status === 'Active').length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock < 20).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

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
          <h1 className="text-2xl font-bold font-display text-heading">Products</h1>
          <p className="mt-1 text-sm text-muted">
            Manage your marketplace products &middot; {products.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-2">
            <Download size={15} />
            Export
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Plus size={15} />
            Add Product
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="stat-stripe-gold" />
          <div className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
              <Package size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-heading">{products.length}</p>
              <p className="text-xs text-muted">Total Products</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="stat-stripe-green" />
          <div className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
              <Package size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-heading">{activeCount}</p>
              <p className="text-xs text-muted">Active Products</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="stat-stripe-blue" />
          <div className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
              <AlertTriangle size={18} className="text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-heading">{lowStockCount}</p>
              <p className="text-xs text-muted">Low Stock</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="stat-stripe-purple" />
          <div className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <Package size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-heading">{outOfStockCount}</p>
              <p className="text-xs text-muted">Out of Stock</p>
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
            placeholder="Search products by name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="input-field w-full pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-muted" />
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            className="input-field"
          >
            {categoryFilters.map((c) => (
              <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
            ))}
          </select>
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
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Rating</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((product) => {
                const stockInfo = getStockIndicator(product.stock);
                return (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-lg">
                          {product.image}
                        </div>
                        <div>
                          <p className="font-medium text-heading">{product.name}</p>
                          <p className="text-xs text-muted">{product.seller}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <code className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-body">
                        {product.sku}
                      </code>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{product.category}</span>
                    </td>
                    <td className="font-semibold text-heading">${product.price.toFixed(2)}</td>
                    <td>
                      {stockInfo.cls ? (
                        <span className={stockInfo.cls}>{stockInfo.label}</span>
                      ) : (
                        <span className="text-sm text-body">{stockInfo.label}</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Star size={13} className="fill-amber-400 text-amber-400" />
                        <span className="text-sm text-heading font-medium">{product.rating}</span>
                        <span className="text-xs text-muted">({product.reviews})</span>
                      </div>
                    </td>
                    <td>
                      <span className={getStatusBadge(product.status)}>{product.status}</span>
                    </td>
                    <td className="text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionMenu(actionMenu === product.id ? null : product.id)}
                          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-gray-100 hover:text-heading"
                        >
                          <MoreVertical size={15} />
                        </button>
                        <AnimatePresence>
                          {actionMenu === product.id && (
                            <motion.div
                              initial={{ opacity: 0, y: 4, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.97 }}
                              transition={{ duration: 0.12 }}
                              className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-border bg-white shadow-lg"
                            >
                              <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-body transition-colors hover:bg-gray-50 hover:text-heading">
                                <Eye size={14} /> View
                              </button>
                              <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-body transition-colors hover:bg-gray-50 hover:text-heading">
                                <Edit size={14} /> Edit
                              </button>
                              <div className="mx-3 my-0.5 border-t border-border" />
                              <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 transition-colors hover:bg-red-50">
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
                    <Package size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-muted">No products found matching your criteria.</p>
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
            <span className="font-medium text-heading">{filtered.length}</span> products
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
