import type { Metadata } from 'next';
import ProductDetail from './product-detail';
import { ProductJsonLd } from './product-jsonld';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.xelnova.in/api/v1';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.xelnova.in';

async function fetchProduct(slug: string) {
  try {
    const res = await fetch(`${API_URL}/products/${slug}`, { next: { revalidate: 300 } });
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
  const product = await fetchProduct(slug);

  if (!product) {
    return {
      title: 'Product Not Found — Xelnova',
      description: 'The product you are looking for could not be found.',
    };
  }

  const title = product.metaTitle || `${product.name}${product.brand ? ` by ${product.brand}` : ''} — Buy Online at Xelnova`;
  const description =
    product.metaDescription ||
    product.shortDescription ||
    product.description?.slice(0, 160) ||
    `Buy ${product.name} at the best price on Xelnova. Fast delivery, easy returns.`;
  const image = product.images?.[0] || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/products/${slug}`,
      siteName: 'Xelnova',
      type: 'website',
      ...(image ? { images: [{ url: image, width: 800, height: 800, alt: product.name }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  return (
    <>
      {product && <ProductJsonLd product={product} />}
      <ProductDetail />
    </>
  );
}
