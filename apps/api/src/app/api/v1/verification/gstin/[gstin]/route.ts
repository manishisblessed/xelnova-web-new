import { NextRequest, NextResponse } from 'next/server';

function getBackendUrl() {
  return process.env.BACKEND_URL || 'http://localhost:4000';
}

function mapBackendToFrontendShape(backendData: Record<string, unknown>) {
  return {
    gstin: backendData.gstin,
    tradeName: backendData.tradeName ?? '',
    legalName: backendData.legalName ?? '',
    status: backendData.status ?? 'Active',
    registrationDate: backendData.dateOfRegistration ?? '',
    businessType: backendData.constitutionOfBusiness ?? '',
    address: backendData.address ?? '',
    stateCode: backendData.stateCode ?? '',
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gstin: string }> }
) {
  try {
    const { gstin } = await params;
    const gstinUpper = gstin.toUpperCase();

    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstinUpper)) {
      return NextResponse.json(
        { success: false, message: 'Invalid GSTIN format' },
        { status: 400 }
      );
    }

    const BACKEND_URL = getBackendUrl();
    try {
      const backendUrl = `${BACKEND_URL.replace(/\/$/, '')}/api/v1/verification/gstin/${encodeURIComponent(gstinUpper)}`;
      const res = await fetch(backendUrl, {
        signal: AbortSignal.timeout(15000),
        headers: { Accept: 'application/json' },
      });

      const body = await res.json().catch(() => ({}));

      if (res.ok && body.success && body.data) {
        return NextResponse.json({
          success: true,
          data: mapBackendToFrontendShape(body.data as Record<string, unknown>),
        });
      }

      if (!res.ok) {
        const msg =
          (typeof body.message === 'string' && body.message) ||
          (typeof body.error === 'string' && body.error) ||
          'GSTIN verification failed';
        return NextResponse.json({ success: false, message: msg }, { status: res.status });
      }
    } catch (e) {
      console.warn('[GSTIN] Backend proxy failed, trying direct API:', e);
    }

    // Fallback: call gstincheck directly when GSTIN_API_KEY is set on this app (no backend)
    const apiKey = process.env.GSTIN_API_KEY?.trim();
    if (apiKey) {
      try {
        const res = await fetch(
          `https://sheet.gstincheck.co.in/check/${apiKey}/${gstinUpper}`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.flag) {
            return NextResponse.json({
              success: true,
              data: {
                gstin: gstinUpper,
                tradeName: data.data?.tradeNam || '',
                legalName: data.data?.lgnm || '',
                status: data.data?.sts || 'Active',
                registrationDate: data.data?.rgdt || '',
                businessType: data.data?.ctb || '',
                address: data.data?.pradr?.adr || '',
                stateCode: gstinUpper.substring(0, 2),
              },
            });
          }
          return NextResponse.json(
            {
              success: false,
              message: data.message || 'GSTIN not found or invalid',
            },
            { status: 400 }
          );
        }
      } catch {
        // External API unavailable
      }
    }

    return NextResponse.json(
      {
        success: false,
        message:
          'Unable to verify GSTIN. Start the NestJS backend (port 4000) or set GSTIN_API_KEY in apps/api/.env.local.',
      },
      { status: 503 }
    );
  } catch (error) {
    console.error('GSTIN verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to verify GSTIN' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
