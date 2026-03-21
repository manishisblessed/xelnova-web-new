import { NextRequest, NextResponse } from 'next/server';
import type { LogsResponse, ApiLogEntry, UserActivityEntry, SystemMetrics, ErrorLogEntry } from '@/lib/types';

function randomId() {
  return Math.random().toString(36).slice(2, 11);
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateApiLogs(count: number): ApiLogEntry[] {
  const endpoints = [
    '/api/auth/login',
    '/api/dashboard',
    '/api/logs',
    '/api/products',
    '/api/orders',
    '/api/users',
    '/api/sellers',
  ];
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  const statuses = [200, 201, 400, 401, 404, 500];
  const logs: ApiLogEntry[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    logs.push({
      id: randomId(),
      endpoint: randomFrom(endpoints),
      method: randomFrom(methods),
      status: randomFrom(statuses),
      responseTimeMs: Math.round(20 + Math.random() * 400),
      timestamp: new Date(now - i * 10000 - Math.random() * 60000).toISOString(),
    });
  }
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function generateUserActivity(count: number): UserActivityEntry[] {
  const users = ['admin@xelnova.com', 'seller@xelnova.com', 'support@xelnova.com'];
  const actions = ['login', 'order created', 'product updated', 'logout', 'password changed', 'export data'];
  const ips = ['192.168.1.1', '10.0.0.5', '172.16.0.10', '203.0.113.42'];
  const logs: UserActivityEntry[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    logs.push({
      id: randomId(),
      user: randomFrom(users),
      action: randomFrom(actions),
      ip: randomFrom(ips),
      timestamp: new Date(now - i * 15000 - Math.random() * 120000).toISOString(),
    });
  }
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function generateSystemMetrics(): SystemMetrics {
  return {
    cpuUsage: Math.round(20 + Math.random() * 60),
    memoryUsage: Math.round(40 + Math.random() * 45),
    activeSessions: Math.round(5 + Math.random() * 25),
  };
}

function generateErrorLogs(count: number): ErrorLogEntry[] {
  const messages = [
    'Connection timeout to database',
    'Invalid token in request',
    'Rate limit exceeded',
    'Validation failed for field: email',
    'File not found: uploads/image.png',
  ];
  const stacks = [
    'Error: Connection timeout\\n    at DB.connect (db.ts:42)\\n    at Server.run (server.ts:18)',
    'Error: Invalid token\\n    at AuthMiddleware (auth.ts:31)',
  ];
  const severities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
  const logs: ErrorLogEntry[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    logs.push({
      id: randomId(),
      message: randomFrom(messages),
      stack: randomFrom(stacks),
      severity: randomFrom(severities),
      timestamp: new Date(now - i * 30000 - Math.random() * 60000).toISOString(),
    });
  }
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search')?.toLowerCase() || '';

    const apiLogs = generateApiLogs(25);
    const userActivity = generateUserActivity(15);
    const systemMetrics = generateSystemMetrics();
    const errorLogs = generateErrorLogs(12);

    let filteredApiLogs = apiLogs;
    if (statusFilter) {
      const status = parseInt(statusFilter, 10);
      filteredApiLogs = filteredApiLogs.filter((l) => l.status === status);
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      filteredApiLogs = filteredApiLogs.filter((l) => new Date(l.timestamp).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      filteredApiLogs = filteredApiLogs.filter((l) => new Date(l.timestamp).getTime() <= to);
    }
    if (search) {
      filteredApiLogs = filteredApiLogs.filter(
        (l) =>
          l.endpoint.toLowerCase().includes(search) ||
          l.method.toLowerCase().includes(search)
      );
    }

    const data: LogsResponse = {
      apiLogs: filteredApiLogs,
      userActivity,
      systemMetrics,
      errorLogs,
    };

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
