import { NextRequest, NextResponse } from 'next/server';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function resolveServerApiV1Base(request: NextRequest): string {
  const fromPublic = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromPublic) return fromPublic.replace(/\/$/, '');

  const fromEnv =
    process.env.BACKEND_URL?.trim() || process.env.ADMIN_INTERNAL_API_URL?.trim();
  if (fromEnv) {
    const b = fromEnv.replace(/\/$/, '');
    return b.endsWith('/api/v1') ? b : `${b}/api/v1`;
  }

  const { origin } = new URL(request.url);
  return `${origin}/api/v1`;
}

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('xelnova-dashboard-refresh')?.value;
    if (!refreshToken) {
      return NextResponse.json({ success: false, error: 'No refresh token' }, { status: 401 });
    }

    const apiV1 = resolveServerApiV1Base(request);
    const backendRes = await fetch(`${apiV1}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Role': 'ADMIN',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!backendRes.ok) {
      const res = NextResponse.json({ success: false, error: 'Refresh failed' }, { status: 401 });
      res.cookies.delete('xelnova-dashboard-token');
      res.cookies.delete('xelnova-dashboard-role');
      res.cookies.delete('xelnova-dashboard-user');
      res.cookies.delete('xelnova-dashboard-refresh');
      return res;
    }

    const data = await backendRes.json();
    const { accessToken, refreshToken: newRefreshToken, user } = data.data || data;

    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'No access token returned' }, { status: 401 });
    }

    const res = NextResponse.json({ success: true, accessToken });
    const baseCookie = {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    };

    res.cookies.set('xelnova-dashboard-token', accessToken, { ...baseCookie, httpOnly: false });
    if (user && typeof user === 'object') {
      res.cookies.set('xelnova-dashboard-user', JSON.stringify(user), { ...baseCookie, httpOnly: false });
    }
    if (newRefreshToken) {
      res.cookies.set('xelnova-dashboard-refresh', newRefreshToken, { ...baseCookie, httpOnly: true });
    }

    return res;
  } catch {
    return NextResponse.json({ success: false, error: 'Refresh failed' }, { status: 500 });
  }
}
