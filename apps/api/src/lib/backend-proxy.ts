import { NextRequest, NextResponse } from 'next/server';

function getBackendUrl() {
  const url = process.env.BACKEND_URL;
  if (!url) throw new Error('BACKEND_URL is not configured. Set NEXT_PUBLIC_BACKEND_URL in Amplify env vars.');
  return url;
}

export async function proxyToBackend(
  request: NextRequest,
  prefix: string,
  segments: string[] | undefined,
) {
  const BACKEND_URL = getBackendUrl();
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

  const method = request.method;
  const init: RequestInit = { method, headers };

  if (!['GET', 'HEAD'].includes(method)) {
    const buf = await request.arrayBuffer();
    if (buf.byteLength > 0) init.body = buf;
  }

  const res = await fetch(target, init);
  const outHeaders = new Headers(res.headers);
  return new NextResponse(res.body, { status: res.status, headers: outHeaders });
}
