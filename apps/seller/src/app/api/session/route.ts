import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, role, user } = body;
    if (!token || !role) return NextResponse.json({ success: false }, { status: 400 });
    const expiresIn = 60 * 60 * 24;
    const res = NextResponse.json({ success: true });
    res.cookies.set('xelnova-dashboard-token', token, { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: expiresIn, path: '/' });
    res.cookies.set('xelnova-dashboard-role', role, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: expiresIn, path: '/' });
    if (user && typeof user === 'object') {
      res.cookies.set('xelnova-dashboard-user', JSON.stringify(user), { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: expiresIn, path: '/' });
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
  return res;
}
