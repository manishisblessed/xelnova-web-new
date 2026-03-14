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
  FileText,
  ExternalLink,
} from 'lucide-react';
import { pages, type Page } from '@/lib/mock-data';

const statuses = ['All', 'Published', 'Draft'];

function getStatusBadge(status: Page['status']) {
  switch (status) {
    case 'Published':
      return 'badge badge-success';
    case 'Draft':
      return 'badge badge-warning';
  }
}

export default function PagesPage() {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const perPage = 5;

  const filtered = pages.filter((p) => {
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase());
    const matchStatus = selectedStatus === 'All' || p.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

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
          <h1 className="text-2xl font-bold font-display text-heading">
            Pages
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            Manage static pages &middot;{' '}
            <span className="text-body font-medium">{pages.length} total</span>
          </p>
        </div>
        <button className="btn-primary">
          <Plus size={15} />
          Create Page
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            placeholder="Search pages by title or slug..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="input-field w-full pl-10 pr-4"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-muted" />
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="input-field pr-8"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All Statuses' : s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Author</th>
                <th>Last Updated</th>
                <th>Views</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((page, i) => (
                <motion.tr
                  key={page.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="group"
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                        <FileText size={15} />
                      </div>
                      <span className="font-medium text-heading">
                        {page.title}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <code className="rounded bg-gray-100 px-2 py-0.5 font-mono text-sm text-body">
                        /{page.slug}
                      </code>
                      <button className="rounded p-0.5 text-muted opacity-0 transition-all hover:text-primary-500 group-hover:opacity-100">
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className={getStatusBadge(page.status)}>
                      {page.status}
                    </span>
                  </td>
                  <td className="text-sm text-body">{page.author}</td>
                  <td className="text-sm text-muted">{page.updatedAt}</td>
                  <td className="text-sm font-medium text-heading">
                    {page.views.toLocaleString()}
                  </td>
                  <td className="text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() =>
                          setActionMenu(
                            actionMenu === page.id ? null : page.id
                          )
                        }
                        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-gray-100 hover:text-heading"
                      >
                        <MoreVertical size={15} />
                      </button>
                      <AnimatePresence>
                        {actionMenu === page.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.97 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-border bg-white shadow-dropdown"
                          >
                            <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-body transition-colors hover:bg-gray-50 hover:text-heading">
                              <Eye size={14} /> Preview
                            </button>
                            <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-body transition-colors hover:bg-gray-50 hover:text-heading">
                              <Edit size={14} /> Edit
                            </button>
                            <div className="mx-3 my-0.5 border-t border-border" />
                            <button className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-danger-500 transition-colors hover:bg-danger-50">
                              <Trash2 size={14} /> Delete
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
                  <td colSpan={7} className="py-12 text-center">
                    <FileText
                      size={40}
                      className="mx-auto mb-3 text-gray-300"
                    />
                    <p className="text-sm text-muted">
                      No pages found matching your criteria.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-6 py-3.5">
          <p className="text-sm text-muted">
            Showing{' '}
            <span className="font-medium text-heading">
              {(currentPage - 1) * perPage + 1}
            </span>
            &ndash;
            <span className="font-medium text-heading">
              {Math.min(currentPage * perPage, filtered.length)}
            </span>{' '}
            of{' '}
            <span className="font-medium text-heading">{filtered.length}</span>{' '}
            pages
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-gray-100 hover:text-heading disabled:opacity-30"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                onClick={() => setCurrentPage(pg)}
                className={`h-8 w-8 rounded-lg text-sm font-medium transition-all ${
                  pg === currentPage
                    ? 'bg-primary-400 text-white shadow-gold'
                    : 'text-muted hover:bg-gray-100 hover:text-heading'
                }`}
              >
                {pg}
              </button>
            ))}
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
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
