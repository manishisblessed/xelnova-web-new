import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('xelnova-dashboard-token')?.value;

  if (pathname === '/login') {
    if (token) return NextResponse.redirect(new URL('/dashboard', request.url));
    return NextResponse.next();
  }

  // Protect all admin panel routes except login and API
  if (!token && pathname !== '/login' && !pathname.startsWith('/api')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/dashboard',
    '/dashboard/:path*',
    '/logs',
    '/logs/:path*',
    '/products',
    '/products/:path*',
    '/categories',
    '/categories/:path*',
    '/brands',
    '/brands/:path*',
    '/orders',
    '/orders/:path*',
    '/customers',
    '/customers/:path*',
    '/sellers',
    '/sellers/:path*',
    '/banners',
    '/banners/:path*',
    '/flash-deals',
    '/flash-deals/:path*',
    '/coupons',
    '/coupons/:path*',
    '/revenue',
    '/revenue/:path*',
    '/commission',
    '/commission/:path*',
    '/payouts',
    '/payouts/:path*',
    '/pages',
    '/pages/:path*',
    '/roles',
    '/roles/:path*',
    '/settings',
    '/settings/:path*',
  ],
};
