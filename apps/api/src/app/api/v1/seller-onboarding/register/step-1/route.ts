import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function POST(request: NextRequest) {
  return proxyToBackend(request, 'seller-onboarding', ['register', 'step-1']);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
