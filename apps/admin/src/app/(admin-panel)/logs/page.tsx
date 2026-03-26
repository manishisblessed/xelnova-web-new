'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Search, Calendar } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { LogViewer } from '@/components/dashboard/log-viewer';
import { apiLogs } from '@/lib/api';
import type { ApiLogEntry, UserActivityEntry, SystemMetrics, ErrorLogEntry } from '@/lib/types';
import { toast } from 'sonner';

const REFRESH_MS = 15_000;

type ApiRequestRow = {
  id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  createdAt: string;
  error?: string | null;
};

type ActivityRow = {
  id: string;
  action: string;
  ipAddress?: string | null;
  createdAt: string;
  user?: { name?: string | null; email?: string | null } | null;
};

type StatsPayload = {
  stats?: {
    totalRequests?: number;
    errorRequests?: number;
    avgResponseTime?: string | number;
    activeUsers?: number;
  };
};

function mapApiLogsResponse(raw: unknown): { logs: ApiRequestRow[] } {
  const o = raw as { logs?: ApiRequestRow[] };
  return { logs: Array.isArray(o.logs) ? o.logs : [] };
}

function mapActivityResponse(raw: unknown): { logs: ActivityRow[] } {
  const o = raw as { logs?: ActivityRow[] };
  return { logs: Array.isArray(o.logs) ? o.logs : [] };
}

export default function LogsPage() {
  const [apiLogsRows, setApiLogsRows] = useState<ApiLogEntry[]>([]);
  const [userActivityRows, setUserActivityRows] = useState<UserActivityEntry[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cpuUsage: 0,
    memoryUsage: 0,
    activeSessions: 0,
  });
  const [errorLogsRows, setErrorLogsRows] = useState<ErrorLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    const apiParams: Record<string, string> = { limit: '80', page: '1' };
    if (dateFrom) apiParams.startDate = dateFrom;
    if (dateTo) apiParams.endDate = dateTo;
    if (statusFilter) apiParams.statusCode = statusFilter;
    if (search.trim()) apiParams.endpoint = search.trim();

    const actParams: Record<string, string> = { limit: '40', page: '1' };
    if (dateFrom) actParams.startDate = dateFrom;
    if (dateTo) actParams.endDate = dateTo;

    try {
      const [apiRaw, activityRaw, statsRaw] = await Promise.all([
        apiLogs('api-requests', apiParams),
        apiLogs('activity', actParams),
        apiLogs('stats', { period: 'day' }),
      ]);

      const { logs: reqLogs } = mapApiLogsResponse(apiRaw);
      const apiMapped: ApiLogEntry[] = reqLogs.map((l) => ({
        id: l.id,
        endpoint: l.endpoint,
        method: l.method,
        status: l.statusCode,
        responseTimeMs: l.responseTime,
        timestamp: l.createdAt,
      }));
      setApiLogsRows(apiMapped);

      const { logs: actLogs } = mapActivityResponse(activityRaw);
      setUserActivityRows(
        actLogs.map((l) => ({
          id: l.id,
          user: l.user?.name?.trim() || l.user?.email || '—',
          action: l.action,
          ip: l.ipAddress ?? '—',
          timestamp: l.createdAt,
        })),
      );

      const stats = statsRaw as StatsPayload;
      const s = stats?.stats;
      setSystemMetrics({
        cpuUsage: 0,
        memoryUsage: 0,
        activeSessions: typeof s?.activeUsers === 'number' ? s.activeUsers : 0,
      });

      const err: ErrorLogEntry[] = reqLogs
        .filter((l) => l.statusCode >= 400 || (l.error != null && String(l.error).length > 0))
        .map((l) => ({
          id: l.id,
          message: l.error?.trim() || `${l.method} ${l.endpoint}`,
          stack: `HTTP ${l.statusCode}`,
          severity: (l.statusCode >= 500 ? 'high' : 'medium') as ErrorLogEntry['severity'],
          timestamp: l.createdAt,
        }));
      setErrorLogsRows(err);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load logs');
    }
  }, [dateFrom, dateTo, statusFilter, search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchLogs();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchLogs]);

  useEffect(() => {
    const id = setInterval(() => {
      fetchLogs();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchLogs]);

  return (
    <>
      <DashboardHeader title="System Logs" />
      <div className="p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3"
        >
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
            <Calendar size={18} className="text-text-muted" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent text-sm text-text-primary outline-none"
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
            <Calendar size={18} className="text-text-muted" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-sm text-text-primary outline-none"
            />
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
              placeholder="Filter API logs by endpoint (contains)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchLogs().finally(() => setLoading(false));
            }}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-muted transition-colors"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </motion.div>
        <LogViewer
          apiLogs={apiLogsRows}
          userActivity={userActivityRows}
          systemMetrics={systemMetrics}
          errorLogs={errorLogsRows}
          loading={loading}
        />
      </div>
    </>
  );
}
