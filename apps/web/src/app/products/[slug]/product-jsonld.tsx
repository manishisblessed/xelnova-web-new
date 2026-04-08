const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.xelnova.in';

interface Props {
  product: {
    name: string;
    slug: string;
    description?: string | null;
    shortDescription?: string | null;
    price: number;
    compareAtPrice?: number | null;
    images?: string[];
    brand?: string | null;
    rating?: number;
    reviewCount?: number;
    stock?: number;
    sku?: string | null;
    category?: { name?: string } | string | null;
    seller?: { storeName?: string } | null;
  };
}

export function ProductJsonLd({ product }: Props) {
  const url = `${SITE_URL}/products/${product.slug}`;
  const categoryName =
    typeof product.category === 'object' && product.category
      ? product.category.name
      : typeof product.category === 'string'
        ? product.category
        : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription || product.description?.slice(0, 500) || undefined,
    url,
    image: product.images?.length ? product.images : undefined,
    sku: product.sku || undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    category: categoryName || undefined,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'INR',
      price: product.price,
      availability:
        (product.stock ?? 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: product.seller?.storeName
        ? { '@type': 'Organization', name: product.seller.storeName }
        : undefined,
    },
    ...(product.rating && product.reviewCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
