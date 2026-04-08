import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isSellerSession(request: NextRequest): boolean {
  const role = request.cookies.get('xelnova-dashboard-role')?.value;
  return role?.toLowerCase() === 'seller';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('xelnova-dashboard-token')?.value;

  const publicPaths = ['/', '/login', '/register', '/register/digilocker-callback'];
  if (publicPaths.includes(pathname)) {
    if (token && pathname === '/login' && isSellerSession(request)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  const protectedPaths = ['/dashboard', '/orders', '/inventory', '/payouts', '/wallet', '/profile', '/shipping', '/tickets', '/bulk-upload', '/inventory-alerts', '/brands', '/settlement', '/analytics'];
  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (isProtected) {
    if (!token || !isSellerSession(request)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/register/digilocker-callback',
    '/dashboard',
    '/dashboard/:path*',
    '/orders',
    '/orders/:path*',
    '/inventory',
    '/inventory/:path*',
    '/payouts',
    '/payouts/:path*',
    '/wallet',
    '/wallet/:path*',
    '/profile',
    '/profile/:path*',
    '/shipping',
    '/shipping/:path*',
    '/tickets',
    '/tickets/:path*',
    '/bulk-upload',
    '/bulk-upload/:path*',
    '/inventory-alerts',
    '/inventory-alerts/:path*',
    '/brands',
    '/brands/:path*',
    '/settlement',
    '/settlement/:path*',
    '/analytics',
    '/analytics/:path*',
  ],
};
