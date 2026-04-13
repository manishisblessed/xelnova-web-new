import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  return proxyToBackend(request, 'returns', (await ctx.params).path);
}

export async function POST(request: NextRequest, ctx: Ctx) {
  return proxyToBackend(request, 'returns', (await ctx.params).path);
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return proxyToBackend(request, 'returns', (await ctx.params).path);
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  return proxyToBackend(request, 'returns', (await ctx.params).path);
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return proxyToBackend(request, 'returns', (await ctx.params).path);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
