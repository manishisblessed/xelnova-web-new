import { NextRequest, NextResponse } from 'next/server';
import type { LogsResponse } from '@/lib/types';

export async function GET(_request: NextRequest) {
  const data: LogsResponse = {
    apiLogs: [],
    userActivity: [],
    systemMetrics: {
      cpuUsage: 0,
      memoryUsage: 0,
      activeSessions: 0,
    },
    errorLogs: [],
  };

  return NextResponse.json({ success: true, data });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
