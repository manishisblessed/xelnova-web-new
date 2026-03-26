import { NextRequest, NextResponse } from 'next/server';

function getBackendUrl() {
  return process.env.BACKEND_URL || 'http://localhost:4000';
}

async function proxy(request: NextRequest, segments: string[] | undefined) {
  const BACKEND_URL = getBackendUrl();
  const path = segments?.length ? segments.join('/') : '';
  const search = request.nextUrl.search;
  const target = `${BACKEND_URL}/api/v1/seller/${path}${search}`;

  const headers = new Headers();
  const auth = request.headers.get('authorization');
  if (auth) headers.set('Authorization', auth);
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);

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

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  return proxy(request, (await ctx.params).path);
}

export async function POST(request: NextRequest, ctx: Ctx) {
  return proxy(request, (await ctx.params).path);
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return proxy(request, (await ctx.params).path);
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  return proxy(request, (await ctx.params).path);
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return proxy(request, (await ctx.params).path);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
