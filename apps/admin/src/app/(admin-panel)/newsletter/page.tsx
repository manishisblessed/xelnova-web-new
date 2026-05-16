'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  Search,
  RefreshCw,
  Download,
  Trash2,
  Inbox,
  Send,
  Copy,
  Check,
} from 'lucide-react';
import {
  apiGetNewsletterSubscribers,
  apiDeleteNewsletterSubscriber,
  newsletterSubscribersCsvUrl,
  type NewsletterSubscriber,
} from '@/lib/api';

const PAGE_SIZE = 50;
const MARKETING_INBOX = 'marketing@xelnova.in';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function sourceLabel(source: string) {
  const map: Record<string, string> = {
    web_footer: 'Website footer',
    mobile_app: 'Mobile app',
    business: 'Business portal',
  };
  return map[source] || source;
}

export default function NewsletterAdminPage() {
  const [items, setItems] = useState<NewsletterSubscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetNewsletterSubscribers({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscribers');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Remove ${email} from the newsletter list?`)) return;
    setDeleting(id);
    try {
      await apiDeleteNewsletterSubscriber(id);
      setItems((prev) => prev.filter((s) => s.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove subscriber');
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const token =
        typeof document !== 'undefined'
          ? document.cookie.match(/xelnova-dashboard-token=([^;]+)/)?.[1]
          : '';
      const res = await fetch(newsletterSubscribersCsvUrl(), {
        headers: {
          Authorization: token ? `Bearer ${decodeURIComponent(token)}` : '',
          'X-App-Role': 'ADMIN',
        },
      });
      if (!res.ok) throw new Error('Failed to download CSV');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyAll = async () => {
    if (items.length === 0) return;
    try {
      await navigator.clipboard.writeText(items.map((i) => i.email).join(', '));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const newThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return items.filter((i) => new Date(i.createdAt).getTime() >= weekAgo).length;
  }, [items]);

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail size={22} className="text-primary-600" />
            Newsletter Subscribers
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Visitors who signed up via the &ldquo;Stay in the loop&rdquo; form on xelnova.in.
            Notifications are also delivered to{' '}
            <a href={`mailto:${MARKETING_INBOX}`} className="text-primary-700 underline">
              {MARKETING_INBOX}
            </a>
            .
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-muted disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || total === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-60"
          >
            <Download size={16} />
            {downloading ? 'Preparing CSV…' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted mb-1">Total subscribers</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted mb-1">New this page (last 7 days)</p>
          <p className="text-2xl font-bold text-success-600">{newThisWeek}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col">
          <p className="text-xs text-text-muted mb-1">Marketing inbox</p>
          <a
            href={`mailto:${MARKETING_INBOX}`}
            className="text-base font-semibold text-primary-700 hover:underline truncate"
          >
            {MARKETING_INBOX}
          </a>
          <p className="text-[11px] text-text-muted mt-auto pt-1">
            Every new sign-up is also emailed here in real time.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between border-b border-border px-4 py-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="search"
              placeholder="Search by email or source"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-raised py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAll}
              disabled={items.length === 0}
              title="Copy all emails on this page"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-muted disabled:opacity-50"
            >
              {copied ? <Check size={14} className="text-success-600" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy emails'}
            </button>
            <a
              href={`mailto:${MARKETING_INBOX}?subject=Newsletter%20follow-up`}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-muted"
            >
              <Send size={14} />
              Email marketing
            </a>
          </div>
        </div>

        {error ? (
          <div className="p-6 text-sm text-danger-600">{error}</div>
        ) : loading ? (
          <div className="p-12 text-center text-text-muted">Loading subscribers…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            <Inbox size={32} className="mx-auto mb-2 opacity-50" />
            {debouncedSearch
              ? `No subscribers match "${debouncedSearch}"`
              : 'No newsletter subscribers yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold">Subscribed</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.01 }}
                    className="hover:bg-surface-muted/40"
                  >
                    <td className="px-4 py-3">
                      <a
                        href={`mailto:${s.email}`}
                        className="font-medium text-primary-700 hover:underline"
                      >
                        {s.email}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                        {sourceLabel(s.source)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`mailto:${s.email}`}
                          title="Email this subscriber"
                          className="rounded-lg p-2 text-text-secondary hover:bg-surface-muted hover:text-primary-700"
                        >
                          <Send size={14} />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id, s.email)}
                          disabled={deleting === s.id}
                          title="Remove subscriber"
                          className="rounded-lg p-2 text-text-secondary hover:bg-danger-50 hover:text-danger-600 disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {items.length > 0 && totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-text-muted">
            <div>
              Page <span className="font-semibold text-text-primary">{page}</span> of{' '}
              <span className="font-semibold text-text-primary">{totalPages}</span> ·{' '}
              {total} total
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-surface-muted disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-surface-muted disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
