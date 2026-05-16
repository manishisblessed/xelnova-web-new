/**
 * Mobile-side Indian pincode lookup. The backend doesn't expose a dedicated
 * endpoint we can hit (the web uses a Next API route as a thin proxy), so we
 * call India Post's free public API directly.
 *
 * The endpoint is unauthenticated and returns an envelope:
 *   [{ Status: 'Success' | 'Error', PostOffice: [{ Name, District, State, ... }] }]
 *
 * On any failure we return null so callers can fall back to manual entry.
 */
const ENDPOINT = 'https://api.postalpincode.in/pincode/';

export interface PincodeLookupResult {
  pincode: string;
  city: string;
  state: string;
  district: string | null;
}

interface IndianPostOffice {
  Name?: string;
  District?: string;
  State?: string;
  Block?: string;
  Region?: string;
  Country?: string;
}

interface IndianPostResponse {
  Status?: string;
  Message?: string;
  PostOffice?: IndianPostOffice[] | null;
}

/**
 * Lookup `/pincode/{code}` with a short timeout. Returns `null` on:
 *   - non-2xx response
 *   - upstream `Status === 'Error'`
 *   - empty `PostOffice` array
 *   - network / abort errors
 */
export async function lookupPincode(
  pincode: string,
  signal?: AbortSignal,
): Promise<PincodeLookupResult | null> {
  if (!/^[1-9][0-9]{5}$/.test(pincode)) return null;

  const controller = signal ? undefined : new AbortController();
  const timeout = controller
    ? setTimeout(() => controller.abort(), 8_000)
    : null;

  try {
    const res = await fetch(`${ENDPOINT}${pincode}`, {
      signal: signal ?? controller?.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as IndianPostResponse[] | undefined;
    const first = Array.isArray(json) ? json[0] : null;
    if (!first || first.Status !== 'Success') return null;
    const offices = first.PostOffice ?? [];
    if (offices.length === 0) return null;
    const head = offices[0];
    const city = head.Block && head.Block !== 'NA' ? head.Block : head.District;
    return {
      pincode,
      city: city ?? '',
      state: head.State ?? '',
      district: head.District ?? null,
    };
  } catch {
    return null;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
