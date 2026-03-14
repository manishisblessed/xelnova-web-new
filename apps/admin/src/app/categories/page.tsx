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
  FolderTree,
  CheckCircle,
  Star,
} from 'lucide-react';
import { categories, type Category } from '@/lib/mock-data';

const statusFilters = ['All', 'Active', 'Inactive'];

function getStatusBadge(status: Category['status']) {
  switch (status) {
    case 'Active':
      return 'badge badge-success';
    case 'Inactive':
      return 'badge badge-danger';
  }
}

export default function CategoriesPage() {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const perPage = 5;

  const filtered = categories.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = selectedStatus === 'All' || c.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const activeCount = categories.filter((c) => c.status === 'Active').length;
  const featuredCount = categories.filter((c) => c.featured).length;
  const totalProducts = categories.reduce((sum, c) => sum + c.products, 0);

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
          <h1 className="text-2xl font-bold font-display text-heading">Categories</h1>
          <p className="mt-1 text-sm text-muted">
            Organize your product catalog &middot; {categories.length} total
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus size={15} />
          Add Category
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="stat-stripe-gold" />
          <div className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
              <FolderTree size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-heading">{categories.length}</p>
              <p className="text-xs text-muted">Total Categories</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="stat-stripe-green" />
          <div className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-heading">{activeCount}</p>
              <p className="text-xs text-muted">Active Categories</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="stat-stripe-blue" />
          <div className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-50">
              <Star size={18} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-heading">{featuredCount}</p>
              <p className="text-xs text-muted">Featured</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="stat-stripe-purple" />
          <div className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50">
              <FolderTree size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-heading">{totalProducts.toLocaleString()}</p>
              <p className="text-xs text-muted">Total Products</p>
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
            placeholder="Search categories by name..."
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
                <th>Category</th>
                <th>Slug</th>
                <th>Parent</th>
                <th>Products</th>
                <th>Featured</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((category) => (
                <tr key={category.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-lg">
                        {category.image}
                      </div>
                      <span className="font-medium text-heading">{category.name}</span>
                    </div>
                  </td>
                  <td>
                    <code className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-body">
                      {category.slug}
                    </code>
                  </td>
                  <td>
                    {category.parent ? (
                      <span className="badge badge-neutral">{category.parent}</span>
                    ) : (
                      <span className="text-muted">&ndash;</span>
                    )}
                  </td>
                  <td className="font-medium text-heading">{category.products}</td>
                  <td>
                    <Star
                      size={15}
                      className={category.featured ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
                    />
                  </td>
                  <td>
                    <span className={getStatusBadge(category.status)}>{category.status}</span>
                  </td>
                  <td className="text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setActionMenu(actionMenu === category.id ? null : category.id)}
                        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-gray-100 hover:text-heading"
                      >
                        <MoreVertical size={15} />
                      </button>
                      <AnimatePresence>
                        {actionMenu === category.id && (
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
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <FolderTree size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-muted">No categories found matching your criteria.</p>
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
            <span className="font-medium text-heading">{filtered.length}</span> categories
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
