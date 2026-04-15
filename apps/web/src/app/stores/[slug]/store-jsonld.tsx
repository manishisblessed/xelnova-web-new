'use client';

import type { SellerStore } from '@xelnova/api';

interface StoreJsonLdProps {
  store: SellerStore;
}

export function StoreJsonLd({ store }: StoreJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': `https://xelnova.in/stores/${store.slug}`,
    name: store.storeName,
    description: store.description || `Shop products from ${store.storeName} on Xelnova`,
    url: `https://xelnova.in/stores/${store.slug}`,
    logo: store.logo || undefined,
    image: store.heroBannerUrl || store.logo || undefined,
    aggregateRating: store.rating > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: store.rating.toFixed(1),
      bestRating: '5',
      worstRating: '1',
      ratingCount: store.totalSales || 1,
    } : undefined,
    address: store.location ? {
      '@type': 'PostalAddress',
      addressLocality: store.location,
      addressCountry: 'IN',
    } : undefined,
    numberOfItems: store.productCount,
    foundingDate: store.createdAt,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Xelnova',
      url: 'https://xelnova.in',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `https://xelnova.in/stores/${store.slug}?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  // Remove undefined values
  const cleanJsonLd = JSON.parse(JSON.stringify(jsonLd));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanJsonLd) }}
    />
  );
}
