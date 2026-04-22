import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001/api/v1';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('xelnova-dashboard-refresh')?.value;
    if (!refreshToken) {
      return NextResponse.json({ success: false, error: 'No refresh token' }, { status: 401 });
    }

    const backendRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Role': 'SELLER',
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
