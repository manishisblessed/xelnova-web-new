import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const ifscUpper = code.toUpperCase();

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscUpper)) {
      return NextResponse.json(
        { success: false, message: 'Invalid IFSC code format' },
        { status: 400 }
      );
    }

    // Try Razorpay IFSC API (free, no API key needed)
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${ifscUpper}`, {
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          success: true,
          data: {
            IFSC: data.IFSC,
            BANK: data.BANK,
            BRANCH: data.BRANCH,
            ADDRESS: data.ADDRESS,
            CITY: data.CITY,
            STATE: data.STATE,
            CONTACT: data.CONTACT || '',
            MICR: data.MICR || '',
            UPI: data.UPI || false,
            NEFT: data.NEFT || true,
            RTGS: data.RTGS || true,
            IMPS: data.IMPS || true,
          },
        });
      }
    } catch {
      // External API unavailable
    }

    return NextResponse.json(
      { success: false, message: 'Unable to verify IFSC code. Please try again later.' },
      { status: 503 }
    );
  } catch (error) {
    console.error('IFSC verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to verify IFSC code' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
