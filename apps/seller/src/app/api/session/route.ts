import { NextRequest, NextResponse } from 'next/server';

// Sellers complained about being logged out mid-work after the visible
// "session timer" was hidden. The visible timer was only the countdown UI —
// the cookie/JWT TTL is the actual driver. Bumping cookie life to 30 days
// to match a longer-lived backend access token means sellers stay signed
// in for an entire month instead of a single workday.
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, role, user, refreshToken } = body;
    if (!token || !role) return NextResponse.json({ success: false }, { status: 400 });
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
      // Stored httpOnly so it can later drive silent /auth/refresh calls
      // without being exposed to JS.
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
