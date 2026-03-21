'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Users,
  Globe,
  Clock,
  AlertTriangle,
  TrendingUp,
  Server,
  Cpu,
  HardDrive,
  RefreshCw,
  MapPin,
  Monitor,
  Smartphone,
  Shield,
  Eye,
  LogIn,
  UserPlus,
  ShoppingCart,
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Badge } from '@xelnova/ui';

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function fetchWithAuth(endpoint: string) {
  const token = typeof window !== 'undefined' 
    ? document.cookie.split('; ').find(row => row.startsWith('xelnova-dashboard-token='))?.split('=')[1]
    : null;
  
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export default function PerformancePage() {
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'hour' | 'day' | 'week' | 'month'>('day');

  const fetchData = useCallback(async () => {
    try {
      const [perfRes, dashRes, sessRes] = await Promise.all([
        fetchWithAuth(`/logs/stats?period=${period}`),
        fetchWithAuth('/logs/dashboard'),
        fetchWithAuth('/logs/sessions?limit=10'),
      ]);
      
      setPerformanceStats(perfRes.data);
      setDashboardStats(dashRes.data);
      setSessions(sessRes.sessions || []);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const statCards = [
    {
      label: 'Active Sessions',
      value: dashboardStats?.activeSessions || 0,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Total Requests',
      value: performanceStats?.stats.totalRequests || 0,
      icon: Activity,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Avg Response Time',
      value: `${performanceStats?.stats.avgResponseTime || 0}ms`,
      icon: Clock,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Error Rate',
      value: `${performanceStats?.stats.errorRate || 0}%`,
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
  ];

  const activityCards = [
    { label: 'Logins Today', value: dashboardStats?.logins.today || 0, icon: LogIn, color: 'text-emerald-500' },
    { label: 'Logins This Week', value: dashboardStats?.logins.week || 0, icon: TrendingUp, color: 'text-blue-500' },
    { label: 'New Registrations', value: dashboardStats?.registrations.today || 0, icon: UserPlus, color: 'text-purple-500' },
    { label: 'Orders Today', value: dashboardStats?.orders.today || 0, icon: ShoppingCart, color: 'text-orange-500' },
    { label: 'Errors Today', value: dashboardStats?.errorsToday || 0, icon: AlertTriangle, color: 'text-red-500' },
  ];

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN': return <LogIn size={16} className="text-green-500" />;
      case 'LOGOUT': return <LogIn size={16} className="text-gray-500" />;
      case 'REGISTER': return <UserPlus size={16} className="text-blue-500" />;
      case 'LOGIN_FAILED': return <Shield size={16} className="text-red-500" />;
      default: return <Activity size={16} className="text-gray-500" />;
    }
  };

  const getDeviceIcon = (device?: string) => {
    if (device === 'Mobile') return <Smartphone size={16} className="text-blue-500" />;
    return <Monitor size={16} className="text-gray-500" />;
  };

  if (loading) {
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
        {/* Period Selector & Refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(['hour', 'day', 'week', 'month'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
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
            onClick={() => { setLoading(true); fetchData(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface text-sm font-medium hover:bg-surface-muted transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* Main Stats */}
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

        {/* Activity Stats */}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
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
              {performanceStats?.recentActivities.map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-surface-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getActionIcon(activity.action)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary">{activity.message}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                        {activity.user && (
                          <span className="font-medium">{activity.user.name}</span>
                        )}
                        {activity.location?.city && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {activity.location.city}, {activity.location.country}
                          </span>
                        )}
                        <span>{new Date(activity.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <Badge variant={activity.action.includes('FAILED') ? 'danger' : 'success'} className="text-xs">
                      {activity.action}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!performanceStats?.recentActivities || performanceStats.recentActivities.length === 0) && (
                <div className="p-8 text-center text-text-muted">No recent activity</div>
              )}
            </div>
          </motion.div>

          {/* Active Sessions */}
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
                    {getDeviceIcon(session.device)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {session.user?.name || 'Unknown User'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                        <span>{session.browser} on {session.os}</span>
                        {session.city && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {session.city}, {session.country}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={session.isActive ? 'success' : 'default'} className="text-xs">
                        {session.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <p className="text-xs text-text-muted mt-1">
                        {new Date(session.lastActivity).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="p-8 text-center text-text-muted">No active sessions</div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Top Endpoints */}
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
                      <span className={`${Number(endpoint.avgResponseTime) > 500 ? 'text-red-500' : 'text-green-500'}`}>
                        {endpoint.avgResponseTime}ms
                      </span>
                    </td>
                  </tr>
                ))}
                {(!performanceStats?.topEndpoints || performanceStats.topEndpoints.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-text-muted">No data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Activity by Type */}
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
