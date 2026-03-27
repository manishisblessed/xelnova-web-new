import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

type Ctx = { params: Promise<{ sellerId: string }> };

export async function PUT(request: NextRequest, ctx: Ctx) {
  const { sellerId } = await ctx.params;
  return proxyToBackend(request, 'seller-onboarding', ['step-5', sellerId]);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
