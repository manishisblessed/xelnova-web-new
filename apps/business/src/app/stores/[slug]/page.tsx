import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { SellerStore } from '@xelnova/api';
import { StorePage } from './store-page';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.xelnova.in/api/v1';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.xelnova.in';

interface Props {
  params: Promise<{ slug: string }>;
}

async function fetchStore(slug: string): Promise<SellerStore | null> {
  try {
    const res = await fetch(`${API_URL}/stores/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = await fetchStore(slug);
  
  if (!store) {
    return {
      title: 'Store Not Found | Xelnova',
    };
  }

  return {
    title: `${store.storeName} - Official Store | Xelnova`,
    description: store.description || `Shop ${store.storeName}'s products on Xelnova. ${store.productCount} products available. Verified seller with ${store.rating.toFixed(1)} rating.`,
    openGraph: {
      title: `${store.storeName} Store`,
      description: store.description || `Explore ${store.productCount} products from ${store.storeName}`,
      url: `${SITE_URL}/stores/${slug}`,
      siteName: 'Xelnova',
      images: store.heroBannerUrl ? [{ url: store.heroBannerUrl, width: 1200, height: 630 }] : store.logo ? [{ url: store.logo }] : undefined,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${store.storeName} Store | Xelnova`,
      description: store.description || `Shop from ${store.storeName}`,
    },
  };
}

export default async function StorePageRoute({ params }: Props) {
  const { slug } = await params;
  const store = await fetchStore(slug);
  
  if (!store) {
    notFound();
  }
  
  return <StorePage store={store} />;
}
