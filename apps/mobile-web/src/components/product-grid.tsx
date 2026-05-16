import { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import {
  EmptyState,
  ProductCard,
  Skeleton,
  type ProductCardData,
} from '@xelnova/ui-native';
import type { Product } from '@xelnova/api';
import { pickPrimaryImage } from '../lib/image-url';
import { useToggleWishlist, useWishlistIds } from '../lib/use-wishlist';

interface ProductGridProps {
  products: Product[];
  /** When true, renders skeleton tiles instead of empty state. */
  isLoading?: boolean;
  /** Bottom-of-list spinner for paginated grids. */
  isFetchingNextPage?: boolean;
  onEndReached?: () => void;
  /** Rendered above the grid; FlashList lays it out as part of the list to
   *  keep scroll continuity. */
  ListHeaderComponent?: React.ComponentType<unknown> | React.ReactElement | null;
  emptyTitle?: string;
  emptySubtitle?: string;
}

function toCardData(p: Product): ProductCardData {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    imageUrl: pickPrimaryImage(p.images),
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    rating: p.rating,
    reviewCount: p.reviewCount,
    brand: p.brand,
    badge: pickRibbon(p),
    outOfStock: p.stock <= 0,
  };
}

/**
 * Same heuristic as the home rails — surface a tone-typed ribbon for
 * each product so the grid carries the visual variety (Deal / Trending
 * / Limited / New) instead of plain grey-on-white tiles.
 */
function pickRibbon(p: Product): ProductCardData['badge'] {
  if (p.stock > 0 && p.stock <= 5) {
    return { label: 'Limited', tone: 'limited' };
  }
  if (p.isFlashDeal) {
    return { label: 'Deal', tone: 'deal' };
  }
  if (p.isTrending) {
    return { label: 'Trending', tone: 'trending' };
  }
  if (p.compareAtPrice && p.compareAtPrice > p.price * 1.4) {
    return { label: 'Bestseller', tone: 'bestseller' };
  }
  if (
    p.createdAt &&
    Date.now() - new Date(p.createdAt).getTime() < 14 * 24 * 60 * 60 * 1000
  ) {
    return { label: 'New', tone: 'new' };
  }
  return null;
}

export function ProductGrid({
  products,
  isLoading,
  isFetchingNextPage,
  onEndReached,
  ListHeaderComponent,
  emptyTitle = 'No products to show',
  emptySubtitle = 'Try changing the filters or search again',
}: ProductGridProps) {
  const router = useRouter();
  const wishlistIds = useWishlistIds();
  const toggleWishlist = useToggleWishlist();
  const wishlistSet = useMemo(
    () => new Set(wishlistIds.data ?? []),
    [wishlistIds.data],
  );

  if (isLoading && products.length === 0) {
    return (
      <View className="flex-row flex-wrap px-3 gap-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <View key={`sk-${idx}`} className="w-[48%]">
            <Skeleton className="w-full aspect-square rounded-2xl" />
            <Skeleton className="h-3 w-3/4 mt-2 rounded-md" />
            <Skeleton className="h-3 w-1/2 mt-1.5 rounded-md" />
          </View>
        ))}
      </View>
    );
  }

  if (!isLoading && products.length === 0) {
    return (
      <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
    );
  }

  const renderItem: ListRenderItem<Product> = ({ item, index }) => (
    <View
      className="flex-1 px-1.5"
      style={{
        paddingLeft: index % 2 === 0 ? 12 : 6,
        paddingRight: index % 2 === 0 ? 6 : 12,
      }}
    >
      <ProductCard
        product={toCardData(item)}
        layout="grid"
        onPress={() =>
          router.push({
            pathname: '/products/[slug]',
            params: { slug: item.slug },
          })
        }
        wishlist={{
          active: wishlistSet.has(item.id),
          onToggle: () => toggleWishlist.mutate({ product: item }),
        }}
      />
    </View>
  );

  return (
    <FlashList
      data={products}
      keyExtractor={(p) => p.id}
      renderItem={renderItem}
      numColumns={2}
      contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
      ItemSeparatorComponent={() => <View className="h-3" />}
      ListHeaderComponent={ListHeaderComponent ?? null}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View className="py-6 items-center">
            <ActivityIndicator color="#11ab3a" />
          </View>
        ) : null
      }
    />
  );
}
