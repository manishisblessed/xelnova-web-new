import type { Metadata } from 'next';
import BrandPageClient from './brand-page-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.xelnova.in/api/v1';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.xelnova.in';

async function fetchBrandProducts(brandSlug: string) {
  try {
    const res = await fetch(`${API_URL}/products?brand=${encodeURIComponent(brandSlug)}&limit=100`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

async function fetchBrandInfo(slug: string) {
  try {
    const res = await fetch(`${API_URL}/products/brands`, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const json = await res.json();
    const brands = json.data ?? [];
    return brands.find((b: any) => b.slug === slug) || null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const brand = await fetchBrandInfo(slug);
  const brandName = brand?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

  const title = `${brandName} — Shop on Xelnova`;
  const description = `Browse ${brandName} products on Xelnova. Authentic products, best prices, and fast delivery from verified sellers.`;
  const url = `${SITE_URL}/brands/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Xelnova',
      type: 'website',
      images: brand?.logo ? [{ url: brand.logo, width: 400, height: 400 }] : [],
    },
    twitter: { card: 'summary', title, description },
  };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [brand, products] = await Promise.all([fetchBrandInfo(slug), fetchBrandProducts(slug)]);

  return <BrandPageClient slug={slug} brand={brand} products={products || []} />;
}
