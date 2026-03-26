import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

export async function POST(request: NextRequest) {
  const body = await request.text();
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('content-type') || 'application/json',
        'User-Agent': request.headers.get('user-agent') || '',
      },
      body: body || undefined,
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: `Cannot reach auth API at ${BACKEND_URL}. Start the Nest backend (PORT 4000) or set BACKEND_URL. (${detail})`,
      },
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
