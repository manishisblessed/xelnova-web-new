'use client';

/**
 * Session timer was removed per client request (testing observation #13):
 * sellers were being interrupted while working. Component is intentionally
 * a no-op so any stray imports keep compiling but render nothing.
 */
export function SessionTimer() {
  return null;
}
