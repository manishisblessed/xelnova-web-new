import { getApiUrl } from './env';

/**
 * The backend returns image URLs as opaque strings — sometimes absolute
 * (`https://cdn.xelnova.in/...`), sometimes site-relative (`/uploads/foo.jpg`),
 * occasionally Unsplash demo URLs. This helper produces a value that
 * `expo-image` can fetch in every case.
 *
 * - Absolute URLs (`http://`, `https://`, `data:`) are returned verbatim.
 * - Site-relative paths get prefixed with the API origin (derived from
 *   `EXPO_PUBLIC_API_URL`).
 * - Empty / null inputs return null so the consumer can render a placeholder.
 */
export function resolveImageUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const url = input.trim();
  if (!url) return null;

  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:')
  ) {
    return url;
  }

  const apiBase = getApiUrl();
  let origin: string;
  try {
    origin = new URL(apiBase).origin;
  } catch {
    return url;
  }

  if (url.startsWith('/')) return `${origin}${url}`;
  return `${origin}/${url}`;
}

/** Pick the first usable image from a product's image list. */
export function pickPrimaryImage(images: string[] | undefined | null): string | null {
  if (!images || images.length === 0) return null;
  for (const img of images) {
    const resolved = resolveImageUrl(img);
    if (resolved) return resolved;
  }
  return null;
}
