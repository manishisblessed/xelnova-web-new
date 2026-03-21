export type DashboardRole = 'admin' | 'seller';

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  role: DashboardRole;
  avatar?: string | null;
}

export interface ApiLogEntry {
  id: string;
  endpoint: string;
  method: string;
  status: number;
  responseTimeMs: number;
  timestamp: string;
}

export interface UserActivityEntry {
  id: string;
  user: string;
  action: string;
  ip: string;
  timestamp: string;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeSessions: number;
}

export interface ErrorLogEntry {
  id: string;
  message: string;
  stack: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}

export interface LogsResponse {
  apiLogs: ApiLogEntry[];
  userActivity: UserActivityEntry[];
  systemMetrics: SystemMetrics;
  errorLogs: ErrorLogEntry[];
}
