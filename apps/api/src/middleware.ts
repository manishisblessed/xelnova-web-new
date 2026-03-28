import { NextRequest, NextResponse } from 'next/server';

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'https://xelnova.in',
  'https://www.xelnova.in',
  'https://seller.xelnova.in',
  'https://admin.xelnova.in',
];

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '';
  const isAllowed = allowedOrigins.includes(origin) || !origin;

  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', isAllowed ? origin || '*' : '');
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Role');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }

  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', isAllowed ? origin || '*' : '');
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Role');
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
