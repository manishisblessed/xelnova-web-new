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
    '/performance',
    '/performance/:path*',
    '/logs',
    '/logs/:path*',
    '/verifications',
    '/verifications/:path*',
    '/seller-onboarding',
    '/seller-onboarding/:path*',
    '/products',
    '/products/:path*',
    '/categories',
    '/categories/:path*',
    '/brands',
    '/brands/:path*',
    '/orders',
    '/orders/:path*',
    '/tickets',
    '/tickets/:path*',
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
    '/advance-payouts',
    '/advance-payouts/:path*',
    '/wallets',
    '/wallets/:path*',
    '/reports',
    '/reports/:path*',
    '/duplicates',
    '/duplicates/:path*',
    '/pricing-flags',
    '/pricing-flags/:path*',
    '/abandoned-carts',
    '/abandoned-carts/:path*',
    '/fraud-flags',
    '/fraud-flags/:path*',
    '/pages',
    '/pages/:path*',
    '/roles',
    '/roles/:path*',
    '/sub-admins',
    '/sub-admins/:path*',
    '/settings',
    '/settings/:path*',
  ],
};
