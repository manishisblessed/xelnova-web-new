import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ section: string }> };

const VALID_SECTIONS = [
  'products', 'categories', 'brands', 'orders', 'customers', 'sellers',
  'banners', 'flash-deals', 'coupons', 'revenue', 'commission', 'payouts',
  'pages', 'roles', 'settings',
];

export async function GET(_request: NextRequest, { params }: Params) {
  const { section } = await params;
  if (!VALID_SECTIONS.includes(section)) {
    return NextResponse.json({ success: false, message: `Unknown section: ${section}` }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: [] });
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
