import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountNumber, ifscCode } = body;

    if (!accountNumber || !/^[0-9]{9,18}$/.test(accountNumber)) {
      return NextResponse.json(
        { success: false, message: 'Invalid bank account number (must be 9-18 digits)' },
        { status: 400 }
      );
    }

    if (!ifscCode || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
      return NextResponse.json(
        { success: false, message: 'Invalid IFSC code format' },
        { status: 400 }
      );
    }

    const backendUrl = `${BACKEND_URL.replace(/\/$/, '')}/api/v1/verification/penny-drop`;
    const res = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ accountNumber, ifscCode: ifscCode.toUpperCase() }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    }

    const msg =
      (typeof data.message === 'string' && data.message) ||
      'Bank account verification failed';
    return NextResponse.json({ success: false, message: msg }, { status: res.status });
  } catch (error) {
    console.error('Penny-drop verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to verify bank account. Please try again later.' },
      { status: 503 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
