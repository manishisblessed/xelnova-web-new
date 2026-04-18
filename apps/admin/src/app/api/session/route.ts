import { NextRequest, NextResponse } from 'next/server';

// Keep admin sessions long-lived to avoid mid-task forced logouts.
// Matches the seller dashboard policy.
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, role, user, refreshToken } = body;
    if (!token || !role) {
      return NextResponse.json({ success: false }, { status: 400 });
    }
    const res = NextResponse.json({ success: true });
    const baseCookie = {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    };
    res.cookies.set('xelnova-dashboard-token', token, { ...baseCookie, httpOnly: false });
    res.cookies.set('xelnova-dashboard-role', role, { ...baseCookie, httpOnly: true });
    if (user && typeof user === 'object') {
      res.cookies.set('xelnova-dashboard-user', JSON.stringify(user), { ...baseCookie, httpOnly: false });
    }
    if (typeof refreshToken === 'string' && refreshToken) {
      res.cookies.set('xelnova-dashboard-refresh', refreshToken, { ...baseCookie, httpOnly: true });
    }
    return res;
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete('xelnova-dashboard-token');
  res.cookies.delete('xelnova-dashboard-role');
  res.cookies.delete('xelnova-dashboard-user');
  res.cookies.delete('xelnova-dashboard-refresh');
  return res;
}
