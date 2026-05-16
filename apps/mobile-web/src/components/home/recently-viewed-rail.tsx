import { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ProductCard,
  SectionHeader,
  type ProductCardData,
} from '@xelnova/ui-native';
import {
  getRecentProducts,
  type RecentProduct,
} from '../../lib/local-history';

function toCardData(p: RecentProduct): ProductCardData {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    imageUrl: p.imageUrl,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    rating: p.rating,
    reviewCount: p.reviewCount,
    brand: p.brand,
    badge: null,
    outOfStock: false,
  };
}

/**
 * Surfaces locally-stored recently viewed products. Hides itself when there
 * is nothing to show — this makes it safe to drop into the home feed.
 */
export function RecentlyViewedRail() {
  const router = useRouter();
  const [items, setItems] = useState<RecentProduct[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getRecentProducts().then((list) => {
        if (alive) setItems(list);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  if (items.length === 0) return null;

  return (
    <View>
      <SectionHeader title="Recently viewed" subtitle="Pick up where you left off" />
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        renderItem={({ item }) => (
          <ProductCard
            product={toCardData(item)}
            layout="rail"
            onPress={() =>
              router.push({
                pathname: '/products/[slug]',
                params: { slug: item.slug },
              })
            }
          />
        )}
      />
    </View>
  );
}
