/**
 * Preview / links must open the customer marketplace, not the seller dashboard origin.
 * API may return an absolute URL (preferred) or a path like `/stores/my-store`.
 */
export function resolveStorefrontPreviewUrl(storeUrl: string | undefined | null): string | null {
  const raw = storeUrl?.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const path = raw.startsWith('/') ? raw : `/${raw}`;

  const fromEnv =
    process.env.NEXT_PUBLIC_STOREFRONT_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_CUSTOMER_SITE_URL?.replace(/\/$/, '');
  if (fromEnv) {
    return `${fromEnv}${path}`;
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;

    if (hostname.startsWith('seller.')) {
      const mainHost = hostname.slice('seller.'.length);
      const portPart = port ? `:${port}` : '';
      return `${protocol}//${mainHost}${portPart}${path}`;
    }

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const webPort = process.env.NEXT_PUBLIC_STOREFRONT_PORT || '3000';
      return `${protocol}//${hostname}:${webPort}${path}`;
    }
  }

  return `https://xelnova.in${path}`;
}
