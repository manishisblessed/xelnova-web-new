/**
 * Base URL for browser → Nest API calls.
 * Default `/api/v1` is same-origin; `next.config.ts` rewrites it to the Nest server in dev.
 */
export function publicApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return '/api/v1';
}
