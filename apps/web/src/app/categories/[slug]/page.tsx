import type { Metadata } from 'next';
import CategoryPageClient from './category-page-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.xelnova.in/api/v1';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.xelnova.in';

async function fetchCategory(slug: string) {
  try {
    const res = await fetch(`${API_URL}/categories/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchCategory(slug);

  if (!data?.category) {
    return {
      title: 'Category Not Found — Xelnova',
      description: 'The category you are looking for could not be found.',
    };
  }

  const { category } = data;
  const title = `${category.name} — Shop Online at Xelnova`;
  const description = category.description || `Browse ${category.name} products on Xelnova. Best prices, fast delivery, and verified sellers.`;
  const url = `${SITE_URL}/categories/${slug}`;

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
      images: category.image ? [{ url: category.image, width: 800, height: 600 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await fetchCategory(slug);

  return <CategoryPageClient slug={slug} initialData={data} />;
}
