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

function getRoleFromToken(authHeader: string | null): 'admin' | 'seller' {
  if (!authHeader?.startsWith('Bearer ')) return 'admin';
  const token = authHeader.slice(7);
  if (token.includes('admin')) return 'admin';
  if (token.includes('seller')) return 'seller';
  return 'admin';
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const role = getRoleFromToken(authHeader);

    if (role === 'admin') {
      const data: DashboardResponse = {
        role: 'admin',
        kpis: [
          { label: 'Total Revenue', value: '₹12,45,890', change: 12.5, changeLabel: 'vs last month' },
          { label: 'Orders', value: '1,234', change: 8.2, changeLabel: 'vs last month' },
          { label: 'Customers', value: '5,678', change: -2.1, changeLabel: 'vs last month' },
          { label: 'Sellers', value: '89', change: 5.0, changeLabel: 'vs last month' },
        ],
        revenueChart: [
          { name: 'Jan', value: 280000, revenue: 280000 },
          { name: 'Feb', value: 320000, revenue: 320000 },
          { name: 'Mar', value: 290000, revenue: 290000 },
          { name: 'Apr', value: 410000, revenue: 410000 },
          { name: 'May', value: 380000, revenue: 380000 },
          { name: 'Jun', value: 450000, revenue: 450000 },
        ],
        ordersChart: [
          { name: 'Mon', value: 120, orders: 120 },
          { name: 'Tue', value: 98, orders: 98 },
          { name: 'Wed', value: 156, orders: 156 },
          { name: 'Thu', value: 134, orders: 134 },
          { name: 'Fri', value: 189, orders: 189 },
          { name: 'Sat', value: 210, orders: 210 },
          { name: 'Sun', value: 165, orders: 165 },
        ],
        recentOrders: [
          { id: '1', orderNumber: 'ORD-1001', customer: 'John Doe', total: 4599, status: 'Delivered', createdAt: new Date().toISOString() },
          { id: '2', orderNumber: 'ORD-1002', customer: 'Jane Smith', total: 8999, status: 'Shipped', createdAt: new Date().toISOString() },
          { id: '3', orderNumber: 'ORD-1003', customer: 'Bob Wilson', total: 2499, status: 'Processing', createdAt: new Date().toISOString() },
        ],
        recentUsers: [
          { id: '1', name: 'Alice Brown', email: 'alice@example.com', role: 'Customer', joinedAt: new Date().toISOString() },
          { id: '2', name: 'Charlie Davis', email: 'charlie@example.com', role: 'Seller', joinedAt: new Date().toISOString() },
        ],
      };
      return NextResponse.json({ success: true, data });
    }

    const data: DashboardResponse = {
      role: 'seller',
      kpis: [
        { label: 'Earnings', value: '₹2,34,500', change: 15.3, changeLabel: 'vs last month' },
        { label: 'Orders', value: '342', change: 6.1, changeLabel: 'vs last month' },
        { label: 'Products', value: '128', change: 0, changeLabel: 'active listings' },
        { label: 'Conversion', value: '4.2%', change: 0.5, changeLabel: 'vs last month' },
      ],
      revenueChart: [
        { name: 'Jan', value: 45000, revenue: 45000 },
        { name: 'Feb', value: 52000, revenue: 52000 },
        { name: 'Mar', value: 48000, revenue: 48000 },
        { name: 'Apr', value: 61000, revenue: 61000 },
        { name: 'May', value: 58000, revenue: 58000 },
        { name: 'Jun', value: 72000, revenue: 72000 },
      ],
      ordersChart: [
        { name: 'Mon', value: 45, orders: 45 },
        { name: 'Tue', value: 38, orders: 38 },
        { name: 'Wed', value: 52, orders: 52 },
        { name: 'Thu', value: 41, orders: 41 },
        { name: 'Fri', value: 60, orders: 60 },
        { name: 'Sat', value: 55, orders: 55 },
        { name: 'Sun', value: 42, orders: 42 },
      ],
      recentOrders: [
        { id: '1', orderNumber: 'ORD-2001', customer: 'Customer A', total: 3599, status: 'Pending', createdAt: new Date().toISOString() },
        { id: '2', orderNumber: 'ORD-2002', customer: 'Customer B', total: 5699, status: 'Shipped', createdAt: new Date().toISOString() },
      ],
      earnings: { total: 234500, pending: 28500, paid: 206000 },
      inventory: { lowStock: 8, outOfStock: 2, totalProducts: 128 },
      payouts: [
        { id: '1', amount: 45000, status: 'Completed', date: new Date().toISOString() },
        { id: '2', amount: 28500, status: 'Pending', date: new Date().toISOString() },
      ],
    };
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch dashboard' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
