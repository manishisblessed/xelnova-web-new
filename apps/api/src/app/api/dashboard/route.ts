import { NextRequest, NextResponse } from 'next/server';

export interface DashboardKpi {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface DashboardResponse {
  role: 'admin' | 'seller';
  kpis: DashboardKpi[];
  revenueChart: ChartDataPoint[];
  ordersChart: ChartDataPoint[];
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customer: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
  recentUsers?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    joinedAt: string;
  }>;
  earnings?: { total: number; pending: number; paid: number };
  inventory?: { lowStock: number; outOfStock: number; totalProducts: number };
  payouts?: Array<{ id: string; amount: number; status: string; date: string }>;
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      role: 'admin',
      kpis: [],
      revenueChart: [],
      ordersChart: [],
      recentOrders: [],
      recentUsers: [],
    } satisfies DashboardResponse,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
