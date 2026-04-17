import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.xelnova.in';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.xelnova.in/api/v1';

// Generate at request time (with ISR) so a slow/unreachable API never blocks
// the Amplify build. The sitemap is cached for 1 hour at the edge.
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

async function fetchJson<T>(url: string, timeoutMs = 8000): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productsRaw, categories] = await Promise.all([
    fetchJson<any>(`${API_URL}/products?limit=5000`),
    fetchJson<{ slug: string }[]>(`${API_URL}/categories`),
  ]);

  const products: { slug: string; updatedAt?: string }[] = Array.isArray(productsRaw)
    ? productsRaw
    : Array.isArray(productsRaw?.products) ? productsRaw.products : [];

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/search`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/faq`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/support`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/returns`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/shipping`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/careers`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/blog`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE_URL}/seller`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/seller/register`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/track-order`, changeFrequency: 'monthly', priority: 0.4 },
  ];

  const categoryPages: MetadataRoute.Sitemap = (categories || []).map((cat) => ({
    url: `${SITE_URL}/categories/${cat.slug}`,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/products/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
