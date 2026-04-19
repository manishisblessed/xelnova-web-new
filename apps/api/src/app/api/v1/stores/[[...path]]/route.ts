import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Public storefront endpoints powered by NestJS `SellerStoreController`:
//   GET /api/v1/stores/:slug              → store details
//   GET /api/v1/stores/:slug/products     → store products with filters
//   GET /api/v1/stores/:slug/categories   → categories the seller sells in
//   GET /api/v1/stores/:slug/deals        → discounted products
//   GET /api/v1/stores/:slug/bestsellers  → bestselling products
//
// Without this proxy, requests to api.xelnova.in/api/v1/stores/* fall through
// to the Next.js 404 page (the `apps/api` proxy app on api.xelnova.in only
// forwards routes that have a matching catch-all here), which is what was
// breaking every brand-store URL on the marketplace.
type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  return proxyToBackend(request, 'stores', (await ctx.params).path);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
