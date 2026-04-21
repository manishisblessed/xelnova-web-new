import { NextRequest, NextResponse } from 'next/server';

const PROXY_TIMEOUT_MS = 20_000;

function getBackendUrl(): string | null {
  return process.env.BACKEND_URL?.trim() || null;
}

export async function proxyToBackend(
  request: NextRequest,
  prefix: string,
  segments: string[] | undefined,
) {
  const BACKEND_URL = getBackendUrl();
  if (!BACKEND_URL) {
    return NextResponse.json(
      { success: false, message: 'Service temporarily unavailable. Please try again later.' },
      { status: 503 },
    );
  }

  const path = segments?.length ? segments.join('/') : '';
  const search = request.nextUrl.search;
  const target = `${BACKEND_URL}/api/v1/${prefix}/${path}${search}`.replace(/\/+$/, '');

  const headers = new Headers();
  const auth = request.headers.get('authorization');
  if (auth) headers.set('Authorization', auth);
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  const role = request.headers.get('x-role');
  if (role) headers.set('X-Role', role);
  const appRole = request.headers.get('x-app-role');
  if (appRole) headers.set('X-App-Role', appRole);
  const userAgent = request.headers.get('user-agent');
  if (userAgent) headers.set('User-Agent', userAgent);
  const forwarded = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
  if (forwarded) headers.set('X-Forwarded-For', forwarded);

  const method = request.method;
  const init: RequestInit = { method, headers, signal: AbortSignal.timeout(PROXY_TIMEOUT_MS) };

  if (!['GET', 'HEAD'].includes(method)) {
    const buf = await request.arrayBuffer();
    if (buf.byteLength > 0) init.body = buf;
  }

  try {
    const res = await fetch(target, init);
    const outHeaders = new Headers(res.headers);
    return new NextResponse(res.body, { status: res.status, headers: outHeaders });
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === 'TimeoutError';
    console.error(`[proxy] ${method} ${target} failed:`, isTimeout ? 'timeout' : err);
    return NextResponse.json(
      { success: false, message: isTimeout ? 'Request timed out. Please try again.' : 'Service temporarily unavailable. Please try again later.' },
      { status: 503 },
    );
  }
}
