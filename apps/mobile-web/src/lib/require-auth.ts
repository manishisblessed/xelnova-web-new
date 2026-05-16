/**
 * `useRequireAuth` — action-level auth gate.
 *
 * Returns a function `(next, run) => void`:
 *  - If the user is signed in, `run()` fires immediately.
 *  - Otherwise, the user is routed to `/(auth)/login?next=<encoded next>`.
 *    On successful sign-in, the login/register screens read the `next` param
 *    and replace into that route, so the user lands exactly where they were
 *    trying to go.
 *
 * Use at the call site of any "auth-required action" — e.g. proceed to
 * checkout, save to wishlist (when sticking with a server wishlist), open a
 * loyalty/orders/wallet screen from a tile or chip.
 */
import { useCallback } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useAuth } from './auth-context';

export type AuthGatedAction = () => void;

export function useRequireAuth() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  return useCallback(
    (next: Href, run: AuthGatedAction) => {
      if (isAuthenticated) {
        run();
        return;
      }
      router.push({
        pathname: '/(auth)/login',
        params: { next: serializeHref(next) },
      });
    },
    [isAuthenticated, router],
  );
}

/**
 * Serialize an `Href` into a string we can round-trip through a query
 * parameter. For string hrefs we keep them verbatim; object hrefs are
 * JSON-encoded so we can rebuild `{ pathname, params }` on the other side.
 */
function serializeHref(href: Href): string {
  if (typeof href === 'string') return href;
  try {
    return JSON.stringify(href);
  } catch {
    return '/';
  }
}

/**
 * Reverse of `serializeHref`. Used by the login/register screens to figure
 * out where to send the user after a successful sign-in.
 *
 * Falls back to `/(tabs)` if no `next` param was passed or it can't be
 * decoded — that matches the historical behavior.
 */
export function deserializeNext(next: string | string[] | undefined): Href {
  if (!next) return '/(tabs)';
  const value = Array.isArray(next) ? next[0] : next;
  if (!value) return '/(tabs)';
  if (value.startsWith('{')) {
    try {
      return JSON.parse(value) as Href;
    } catch {
      return '/(tabs)';
    }
  }
  return value as Href;
}
