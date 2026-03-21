'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Search, Calendar } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { LogViewer } from '@/components/dashboard/log-viewer';
import { apiLogs } from '@/lib/api';
import type { LogsResponse } from '@/lib/types';

const REFRESH_MS = 5000;

export default function LogsPage() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    const params: Record<string, string> = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (statusFilter) params.status = statusFilter;
    if (search) params.search = search;
    const result = await apiLogs(params);
    setData(result);
  }, [dateFrom, dateTo, statusFilter, search]);

  useEffect(() => {
    let cancelled = false;
    fetchLogs()
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchLogs]);

  useEffect(() => {
    const id = setInterval(fetchLogs, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchLogs]);

  return (
    <>
      <DashboardHeader title="System Logs" />
      <div className="p-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
            <Calendar size={18} className="text-text-muted" />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-transparent text-sm text-text-primary outline-none" />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
            <Calendar size={18} className="text-text-muted" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-transparent text-sm text-text-primary outline-none" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">All statuses</option>
            <option value="200">200</option>
            <option value="201">201</option>
            <option value="400">400</option>
            <option value="401">401</option>
            <option value="404">404</option>
            <option value="500">500</option>
          </select>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 flex-1 min-w-[200px]">
            <Search size={18} className="text-text-muted shrink-0" />
            <input
              type="text"
              placeholder="Search endpoint or method..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
          <button
            onClick={() => { setLoading(true); fetchLogs().finally(() => setLoading(false)); }}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-muted transition-colors"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </motion.div>
        {data && <LogViewer apiLogs={data.apiLogs} userActivity={data.userActivity} systemMetrics={data.systemMetrics} errorLogs={data.errorLogs} loading={loading} />}
        {!data && !loading && <div className="rounded-2xl border border-border bg-surface p-12 text-center text-text-muted">Unable to load logs.</div>}
      </div>
    </>
  );
}
