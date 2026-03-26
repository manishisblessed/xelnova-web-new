import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isSellerSession(request: NextRequest): boolean {
  const role = request.cookies.get('xelnova-dashboard-role')?.value;
  return role?.toLowerCase() === 'seller';
}

function withCoopHeader(response: NextResponse): NextResponse {
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('xelnova-dashboard-token')?.value;

  const publicPaths = ['/', '/login', '/register'];
  if (publicPaths.includes(pathname)) {
    if (token && pathname === '/login' && isSellerSession(request)) {
      return withCoopHeader(NextResponse.redirect(new URL('/dashboard', request.url)));
    }
    return withCoopHeader(NextResponse.next());
  }

  const protectedPaths = ['/dashboard', '/orders', '/inventory', '/payouts', '/profile'];
  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (isProtected) {
    if (!token || !isSellerSession(request)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return withCoopHeader(NextResponse.redirect(loginUrl));
    }
  }

  return withCoopHeader(NextResponse.next());
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/dashboard',
    '/dashboard/:path*',
    '/orders',
    '/orders/:path*',
    '/inventory',
    '/inventory/:path*',
    '/payouts',
    '/payouts/:path*',
    '/profile',
    '/profile/:path*',
  ],
};
