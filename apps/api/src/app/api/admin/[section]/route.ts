import { NextRequest, NextResponse } from 'next/server';
import * as mock from '@/lib/mock-data';

type Params = { params: Promise<{ section: string }> };

const dataGenerators: Record<string, () => unknown> = {
  products: () => mock.generateProducts(30),
  categories: () => mock.generateCategories(),
  brands: () => mock.generateBrands(),
  orders: () => mock.generateOrders(30),
  customers: () => mock.generateCustomers(25),
  sellers: () => mock.generateSellers(15),
  banners: () => mock.generateBanners(8),
  'flash-deals': () => mock.generateFlashDeals(10),
  coupons: () => mock.generateCoupons(12),
  revenue: () => mock.generateRevenueData(),
  commission: () => mock.generateCommissionRules(),
  payouts: () => mock.generatePayouts(15),
  pages: () => mock.generateCmsPages(),
  roles: () => mock.generateRoles(),
  settings: () => mock.generateSettings(),
};

export async function GET(_request: NextRequest, { params }: Params) {
  const { section } = await params;
  const generator = dataGenerators[section];
  if (!generator) {
    return NextResponse.json({ success: false, message: `Unknown section: ${section}` }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: generator() });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { section } = await params;
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, data: { id: String(Date.now()), ...body }, message: `${section} item created` });
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid body' }, { status: 400 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { section } = await params;
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, data: body, message: `${section} item updated` });
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid body' }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { section } = await params;
  return NextResponse.json({ success: true, message: `${section} item deleted` });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
