import { NextResponse } from 'next/server';

/**
 * Server-side proxy for India Post pincode lookup.
 *
 * Why a proxy?
 * - The public api.postalpincode.in endpoint frequently times out from
 *   end-user networks (especially flaky mobile / corporate firewalls),
 *   producing ERR_CONNECTION_TIMED_OUT in the browser console.
 * - Calling it server-side gives us a stable egress IP, lets us retry,
 *   and lets us cache the response so the same pincode never hits the
 *   third-party twice.
 */

export const runtime = 'nodejs';
export const revalidate = 60 * 60 * 24; // 24h

type PostOffice = {
  Name: string;
  BranchType: string;
  DeliveryStatus: string;
  Block: string;
  Division: string;
  District: string;
  State: string;
  Country: string;
};

type IndiaPostResponse = Array<{
  Status: 'Success' | 'Error' | '404';
  Message: string;
  PostOffice: PostOffice[] | null;
}>;

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  return fetch(url, {
    signal: AbortSignal.timeout(ms),
    next: { revalidate: 60 * 60 * 24 },
    headers: { Accept: 'application/json' },
  });
}

async function lookup(pincode: string) {
  // Two attempts in case of transient timeout. Total budget ~9s.
  const attempts = [4500, 4500];
  let lastErr: unknown = null;
  for (const ms of attempts) {
    try {
      const res = await fetchWithTimeout(`https://api.postalpincode.in/pincode/${pincode}`, ms);
      if (!res.ok) throw new Error(`Upstream ${res.status}`);
      const json = (await res.json()) as IndiaPostResponse;
      if (!Array.isArray(json) || json[0]?.Status !== 'Success' || !json[0]?.PostOffice?.length) {
        return null;
      }
      const po = json[0].PostOffice[0];
      return {
        pincode,
        city: po.Block && po.Block !== 'NA' ? po.Block : po.Division,
        state: po.State,
        district: po.District,
      };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('Pincode lookup failed');
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  if (!/^[1-9][0-9]{5}$/.test(code)) {
    return NextResponse.json({ message: 'Invalid pincode' }, { status: 400 });
  }
  try {
    const data = await lookup(code);
    if (!data) {
      return NextResponse.json({ message: 'No results for this pincode' }, { status: 404 });
    }
    return NextResponse.json(
      { data },
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
    );
  } catch {
    return NextResponse.json(
      { message: 'Pincode service is temporarily unavailable. Please try again or enter city/state manually.' },
      { status: 503 },
    );
  }
}
