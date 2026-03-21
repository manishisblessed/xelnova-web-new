import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('xelnova-dashboard-token')?.value;

  const publicPaths = ['/', '/login', '/register'];
  if (publicPaths.includes(pathname)) {
    if (token && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  const protectedPaths = ['/dashboard', '/orders', '/inventory', '/payouts'];
  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (!token && isProtected) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = { matcher: ['/', '/login', '/register', '/dashboard', '/dashboard/:path*', '/orders', '/inventory', '/payouts'] };
