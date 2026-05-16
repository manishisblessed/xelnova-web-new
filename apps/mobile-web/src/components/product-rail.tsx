import { useMemo } from 'react';
import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ProductCard,
  SectionHeader,
  Skeleton,
  type ProductCardData,
  type SectionAccentTone,
} from '@xelnova/ui-native';
import type { Product } from '@xelnova/api';
import { pickPrimaryImage } from '../lib/image-url';
import { useToggleWishlist, useWishlistIds } from '../lib/use-wishlist';

interface ProductRailProps {
  title: string;
  subtitle?: string;
  products: Product[] | undefined;
  isLoading?: boolean;
  /** Show "See all" CTA. */
  onSeeAllPress?: () => void;
  seeAllLabel?: string;
  /** Underline tone for the section header. Defaults to `primary`. */
  accent?: SectionAccentTone;
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
 * Picks a ribbon tone that gives the home rails visual variety. Order
 * matters — the first matching trait wins.
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
    // 40%+ markdown — call it out as a bestseller-style sticker.
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

export function ProductRail({
  title,
  subtitle,
  products,
  isLoading,
  onSeeAllPress,
  seeAllLabel = 'See all',
  accent = 'primary',
}: ProductRailProps) {
  const router = useRouter();
  const wishlistIds = useWishlistIds();
  const toggleWishlist = useToggleWishlist();

  const wishlistSet = useMemo(
    () => new Set(wishlistIds.data ?? []),
    [wishlistIds.data],
  );

  if (!isLoading && (!products || products.length === 0)) return null;

  return (
    <View>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        actionLabel={onSeeAllPress ? seeAllLabel : undefined}
        onActionPress={onSeeAllPress}
        accent={accent}
      />
      {isLoading && (!products || products.length === 0) ? (
        <FlatList
          data={Array.from({ length: 5 }).map((_, i) => i.toString())}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          renderItem={() => (
            <View className="w-40">
              <Skeleton className="w-40 h-40 rounded-2xl" />
              <Skeleton className="w-32 h-3 rounded-md mt-2" />
              <Skeleton className="w-24 h-3 rounded-md mt-1.5" />
            </View>
          )}
        />
      ) : (
        <FlatList
          data={products ?? []}
          keyExtractor={(p) => p.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          // Snap each card's leading edge to the start of the viewport so
          // a flick lands on a product card cleanly instead of mid-tile.
          // 160-px card width + 12-px gap = 172-px snap interval.
          snapToInterval={172}
          snapToAlignment="start"
          decelerationRate="fast"
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
              wishlist={{
                active: wishlistSet.has(item.id),
                onToggle: () => toggleWishlist.mutate({ product: item }),
              }}
            />
          )}
        />
      )}
    </View>
  );
}
