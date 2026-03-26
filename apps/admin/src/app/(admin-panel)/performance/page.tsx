'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Users,
  Clock,
  AlertTriangle,
  TrendingUp,
  Server,
  RefreshCw,
  MapPin,
  Monitor,
  Smartphone,
  Shield,
  LogIn,
  UserPlus,
  ShoppingCart,
  Trash2,
  Pencil,
  Settings,
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Badge } from '@xelnova/ui';
import { apiLogs } from '@/lib/api';
import { toast } from 'sonner';

interface PerformanceStats {
  period: string;
  stats: {
    totalRequests: number;
    errorRequests: number;
    errorRate: string | number;
    avgResponseTime: string | number;
    activeUsers: number;
  };
  recentActivities: Array<{
    id: string;
    type: string;
    action: string;
    message: string;
    userId?: string;
    userRole?: string;
    ipAddress?: string;
    location?: { city?: string; country?: string };
    createdAt: string;
    user?: { name: string; email: string; role: string };
  }>;
  topEndpoints: Array<{
    endpoint: string;
    count: number;
    avgResponseTime: string | number;
  }>;
}

interface DashboardStats {
  logins: { today: number; week: number; month: number };
  registrations: { today: number };
  orders: { today: number };
  activeSessions: number;
  errorsToday: number;
  activityByType: Array<{ type: string; count: number }>;
}

interface UserSession {
  id: string;
  userId: string;
  ipAddress?: string;
  device?: string;
  browser?: string;
  os?: string;
  city?: string;
  country?: string;
  isActive: boolean;
  lastActivity: string;
  user?: { name: string; email: string; role: string };
}

interface PerformanceLogRow {
  id: string;
  type: string;
  metric: string;
  value: number;
  unit: string;
  endpoint?: string | null;
  memoryUsage?: number | null;
  cpuUsage?: number | null;
  createdAt: string;
}

export default function PerformancePage() {
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [performanceRows, setPerformanceRows] = useState<PerformanceLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'hour' | 'day' | 'week' | 'month'>('day');

  const fetchData = useCallback(async () => {
    try {
      const [statsRaw, perfRaw, dashRaw, sessRaw] = await Promise.all([
        apiLogs('stats', { period }),
        apiLogs('performance', { limit: '30', page: '1' }),
        apiLogs('dashboard', {}),
        apiLogs('sessions', { limit: '10', page: '1' }),
      ]);

      setPerformanceStats(statsRaw as PerformanceStats);

      const perfObj = perfRaw as { logs?: PerformanceLogRow[] };
      setPerformanceRows(Array.isArray(perfObj.logs) ? perfObj.logs : []);

      setDashboardStats(dashRaw as DashboardStats);

      const sessObj = sessRaw as { sessions?: UserSession[] };
      setSessions(Array.isArray(sessObj.sessions) ? sessObj.sessions : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const st = performanceStats?.stats;
  const statCards = [
    {
      label: 'Active Sessions',
      value: dashboardStats?.activeSessions ?? st?.activeUsers ?? 0,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Total Requests',
      value: st?.totalRequests ?? 0,
      icon: Activity,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Avg Response Time',
      value: `${st?.avgResponseTime ?? 0}ms`,
      icon: Clock,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Error Rate',
      value: `${st?.errorRate ?? 0}%`,
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
  ];

  const activityCards = [
    { label: 'Logins Today', value: dashboardStats?.logins.today ?? 0, icon: LogIn, color: 'text-emerald-500' },
    { label: 'Logins This Week', value: dashboardStats?.logins.week ?? 0, icon: TrendingUp, color: 'text-blue-500' },
    { label: 'New Registrations', value: dashboardStats?.registrations.today ?? 0, icon: UserPlus, color: 'text-purple-500' },
    { label: 'Orders Today', value: dashboardStats?.orders.today ?? 0, icon: ShoppingCart, color: 'text-orange-500' },
    { label: 'Errors Today', value: dashboardStats?.errorsToday ?? 0, icon: AlertTriangle, color: 'text-red-500' },
  ];

  const getActionStyle = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return { icon: <LogIn size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', label: 'Login' };
      case 'LOGOUT':
        return { icon: <LogIn size={16} />, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400', label: 'Logout' };
      case 'REGISTER':
        return { icon: <UserPlus size={16} />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500', label: 'Registration' };
      case 'LOGIN_FAILED':
        return { icon: <Shield size={16} />, color: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500', label: 'Failed Login' };
      case 'USER_DELETE':
        return { icon: <Trash2 size={16} />, color: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500', label: 'User Deleted' };
      case 'SELLER_DELETE':
        return { icon: <Trash2 size={16} />, color: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500', label: 'Seller Deleted' };
      case 'USER_UPDATE':
        return { icon: <Pencil size={16} />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500', label: 'User Updated' };
      case 'SELLER_UPDATE':
        return { icon: <Pencil size={16} />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500', label: 'Seller Updated' };
      case 'SETTINGS_UPDATE':
        return { icon: <Settings size={16} />, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200', dot: 'bg-violet-500', label: 'Settings' };
      default:
        return { icon: <Activity size={16} />, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400', label: action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) };
    }
  };

  const getDeviceIcon = (device?: string) => {
    if (device === 'Mobile') return <Smartphone size={16} className="text-blue-500" />;
    return <Monitor size={16} className="text-gray-500" />;
  };

  if (loading && !performanceStats && !dashboardStats) {
    return (
      <>
        <DashboardHeader title="Performance & Analytics" />
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-surface p-6 animate-pulse">
                <div className="h-4 w-24 bg-surface-muted rounded mb-2" />
                <div className="h-8 w-16 bg-surface-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader title="Performance & Analytics" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(['hour', 'day', 'week', 'month'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPeriod(p);
                  setLoading(true);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface border border-border text-text-secondary hover:bg-surface-muted'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface text-sm font-medium hover:bg-surface-muted transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {statCards.map((stat, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-text-muted">{stat.label}</span>
                <div className={`p-2 rounded-xl ${stat.bg}`}>
                  <stat.icon size={20} className={stat.color} />
                </div>
              </div>
              <p className="text-3xl font-bold text-text-primary">{stat.value}</p>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
        >
          {activityCards.map((card, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
              <div className="flex items-center gap-3">
                <card.icon size={20} className={card.color} />
                <div>
                  <p className="text-2xl font-bold text-text-primary">{card.value}</p>
                  <p className="text-xs text-text-muted">{card.label}</p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {performanceRows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border bg-surface shadow-card overflow-x-auto"
          >
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Server size={18} className="text-primary-500" />
                Performance log samples
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-text-muted">Metric</th>
                  <th className="text-right py-3 px-4 font-medium text-text-muted">Value</th>
                  <th className="text-left py-3 px-4 font-medium text-text-muted">Time</th>
                </tr>
              </thead>
              <tbody>
                {performanceRows.slice(0, 15).map((row) => (
                  <tr key={row.id} className="border-b border-border-light hover:bg-surface-muted/50">
                    <td className="py-2 px-4">
                      <span className="font-medium">{row.metric}</span>
                      <span className="text-text-muted text-xs ml-2">{row.type}</span>
                    </td>
                    <td className="py-2 px-4 text-right">
                      {row.value} {row.unit}
                    </td>
                    <td className="py-2 px-4 text-text-muted">{new Date(row.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-border bg-surface shadow-card"
          >
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Activity size={18} className="text-primary-500" />
                Recent Activity
              </h3>
            </div>
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {performanceStats?.recentActivities.map((activity) => {
                const style = getActionStyle(activity.action);
                return (
                  <div key={activity.id} className="p-4 hover:bg-surface-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-lg border ${style.bg}`}>
                        <span className={style.color}>{style.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-text-primary leading-snug">{activity.message}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-text-muted flex-wrap">
                          {activity.user && <span className="font-medium text-text-secondary">{activity.user.name}</span>}
                          {activity.location?.city && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {activity.location.city}, {activity.location.country}
                            </span>
                          )}
                          <span>{new Date(activity.createdAt).toLocaleTimeString()}</span>
                          <span className={`ml-auto inline-flex items-center gap-1.5 shrink-0 ${style.color}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                            <span className="text-[11px] font-semibold uppercase tracking-wide">
                              {activity.type === 'ADMIN' ? `Admin · ${style.label}` : style.label}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!performanceStats?.recentActivities || performanceStats.recentActivities.length === 0) && (
                <div className="p-8 text-center text-text-muted">No recent activity</div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-border bg-surface shadow-card"
          >
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Users size={18} className="text-primary-500" />
                Active Sessions
              </h3>
            </div>
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {sessions.map((session) => (
                <div key={session.id} className="p-4 hover:bg-surface-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {getDeviceIcon(session.device)}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full ring-2 ring-surface ${
                          session.isActive ? 'bg-emerald-500' : 'bg-gray-400'
                        }`}
                      >
                        {session.isActive && (
                          <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
                        )}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {session.user?.name || 'Unknown User'}
                        </p>
                        <span
                          className={`text-[11px] font-medium ${
                            session.isActive ? 'text-emerald-600' : 'text-gray-400'
                          }`}
                        >
                          {session.isActive ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                        <span>
                          {session.browser} on {session.os}
                        </span>
                        {session.city && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {session.city}, {session.country}
                          </span>
                        )}
                        <span className="ml-auto text-text-muted">
                          {new Date(session.lastActivity).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && <div className="p-8 text-center text-text-muted">No active sessions</div>}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-border bg-surface shadow-card"
        >
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Server size={18} className="text-primary-500" />
              Top API Endpoints
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-text-muted">Endpoint</th>
                  <th className="text-right py-3 px-4 font-medium text-text-muted">Requests</th>
                  <th className="text-right py-3 px-4 font-medium text-text-muted">Avg Response</th>
                </tr>
              </thead>
              <tbody>
                {performanceStats?.topEndpoints.map((endpoint, i) => (
                  <tr key={i} className="border-b border-border-light hover:bg-surface-muted/50">
                    <td className="py-3 px-4 font-mono text-xs text-text-primary">{endpoint.endpoint}</td>
                    <td className="py-3 px-4 text-right text-text-primary">{endpoint.count}</td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`${Number(endpoint.avgResponseTime) > 500 ? 'text-red-500' : 'text-green-500'}`}
                      >
                        {endpoint.avgResponseTime}ms
                      </span>
                    </td>
                  </tr>
                ))}
                {(!performanceStats?.topEndpoints || performanceStats.topEndpoints.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-text-muted">
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {dashboardStats?.activityByType && dashboardStats.activityByType.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl border border-border bg-surface p-6 shadow-card"
          >
            <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-primary-500" />
              Activity by Type (This Week)
            </h3>
            <div className="flex flex-wrap gap-3">
              {dashboardStats.activityByType.map((item, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-muted">
                  <span className="text-sm font-medium text-text-primary">{item.type}</span>
                  <Badge variant="info">{item.count}</Badge>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
}
