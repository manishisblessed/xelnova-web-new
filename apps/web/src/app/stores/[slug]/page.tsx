import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { storesApi } from '@xelnova/api';
import { StorePage } from './store-page';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const store = await storesApi.getStore(slug);
    
    return {
      title: `${store.storeName} - Official Store | Xelnova`,
      description: store.description || `Shop ${store.storeName}'s products on Xelnova. ${store.productCount} products available. Verified seller with ${store.rating.toFixed(1)} rating.`,
      openGraph: {
        title: `${store.storeName} Store`,
        description: store.description || `Explore ${store.productCount} products from ${store.storeName}`,
        images: store.heroBannerUrl ? [{ url: store.heroBannerUrl, width: 1200, height: 630 }] : store.logo ? [{ url: store.logo }] : undefined,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${store.storeName} Store | Xelnova`,
        description: store.description || `Shop from ${store.storeName}`,
      },
    };
  } catch {
    return {
      title: 'Store Not Found | Xelnova',
    };
  }
}

export default async function StorePageRoute({ params }: Props) {
  const { slug } = await params;
  
  try {
    const store = await storesApi.getStore(slug);
    return <StorePage store={store} />;
  } catch {
    notFound();
  }
}
