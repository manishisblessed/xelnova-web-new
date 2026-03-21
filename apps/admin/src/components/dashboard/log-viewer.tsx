'use client';

import { Badge } from '@xelnova/ui';
import type { ApiLogEntry, UserActivityEntry, SystemMetrics, ErrorLogEntry } from '@/lib/types';

export interface LogViewerProps {
  apiLogs: ApiLogEntry[];
  userActivity: UserActivityEntry[];
  systemMetrics: SystemMetrics;
  errorLogs: ErrorLogEntry[];
  loading?: boolean;
}

function statusBadge(status: number) {
  if (status >= 200 && status < 300)
    return <Badge variant="success" className="bg-success-100 text-success-700 border-success-200">{status}</Badge>;
  if (status >= 400 && status < 500)
    return <Badge variant="warning" className="bg-accent-100 text-accent-700 border-accent-200">{status}</Badge>;
  return <Badge variant="danger">{status}</Badge>;
}

function severityBadge(severity: string) {
  if (severity === 'high') return <Badge variant="danger">{severity}</Badge>;
  if (severity === 'medium') return <Badge variant="warning">{severity}</Badge>;
  return <Badge variant="info">{severity}</Badge>;
}

export function LogViewer({ apiLogs, userActivity, systemMetrics, errorLogs, loading }: LogViewerProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-6">
            <div className="h-5 w-32 rounded bg-surface-muted animate-pulse mb-4" />
            <div className="h-40 rounded bg-surface-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h3 className="text-sm font-medium text-text-muted mb-4">System Metrics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-surface-muted p-4">
            <p className="text-xs text-text-muted">CPU Usage</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{systemMetrics.cpuUsage}%</p>
          </div>
          <div className="rounded-xl bg-surface-muted p-4">
            <p className="text-xs text-text-muted">Memory Usage</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{systemMetrics.memoryUsage}%</p>
          </div>
          <div className="rounded-xl bg-surface-muted p-4">
            <p className="text-xs text-text-muted">Active Sessions</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{systemMetrics.activeSessions}</p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h3 className="text-sm font-medium text-text-muted mb-4">API Logs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-medium text-text-muted">Endpoint</th>
                <th className="text-left py-2 px-3 font-medium text-text-muted">Method</th>
                <th className="text-left py-2 px-3 font-medium text-text-muted">Status</th>
                <th className="text-left py-2 px-3 font-medium text-text-muted">Time (ms)</th>
                <th className="text-left py-2 px-3 font-medium text-text-muted">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {apiLogs.slice(0, 15).map((log) => (
                <tr key={log.id} className="border-b border-border-light hover:bg-surface-muted/50">
                  <td className="py-2 px-3 font-mono text-xs">{log.endpoint}</td>
                  <td className="py-2 px-3">{log.method}</td>
                  <td className="py-2 px-3">{statusBadge(log.status)}</td>
                  <td className="py-2 px-3">{log.responseTimeMs}</td>
                  <td className="py-2 px-3 text-text-muted">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h3 className="text-sm font-medium text-text-muted mb-4">User Activity</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-medium text-text-muted">User</th>
                <th className="text-left py-2 px-3 font-medium text-text-muted">Action</th>
                <th className="text-left py-2 px-3 font-medium text-text-muted">IP</th>
                <th className="text-left py-2 px-3 font-medium text-text-muted">Time</th>
              </tr>
            </thead>
            <tbody>
              {userActivity.slice(0, 10).map((log) => (
                <tr key={log.id} className="border-b border-border-light hover:bg-surface-muted/50">
                  <td className="py-2 px-3">{log.user}</td>
                  <td className="py-2 px-3">{log.action}</td>
                  <td className="py-2 px-3 font-mono text-xs">{log.ip}</td>
                  <td className="py-2 px-3 text-text-muted">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h3 className="text-sm font-medium text-text-muted mb-4">Error Logs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-medium text-text-muted">Message</th>
                <th className="text-left py-2 px-3 font-medium text-text-muted">Severity</th>
                <th className="text-left py-2 px-3 font-medium text-text-muted">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {errorLogs.slice(0, 10).map((log) => (
                <tr key={log.id} className="border-b border-border-light hover:bg-surface-muted/50">
                  <td className="py-2 px-3">
                    <p className="font-medium text-text-primary">{log.message}</p>
                    <p className="text-xs text-text-muted font-mono mt-1 truncate max-w-md">{log.stack}</p>
                  </td>
                  <td className="py-2 px-3">{severityBadge(log.severity)}</td>
                  <td className="py-2 px-3 text-text-muted">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
