import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, RefreshControl, type ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi, type Product } from '@xelnova/api';
import { FadeIn, SectionDivider } from '@xelnova/ui-native';
import { MarketplaceHeader } from '../../src/components/marketplace-header';
import { HeroCarousel } from '../../src/components/home/hero-carousel';
import { CategoryStrip } from '../../src/components/home/category-strip';
import { CategoryTilesGrid, type RichTile } from '../../src/components/home/category-tiles';
import { CategoryGrid } from '../../src/components/home/category-grid';
import { ProductRail } from '../../src/components/product-rail';
import { RecentlyViewedRail } from '../../src/components/home/recently-viewed-rail';
import { FlashCountdownBanner } from '../../src/components/home/flash-countdown';
import { CouponStrip } from '../../src/components/home/coupon-strip';
import { PriceBandChips } from '../../src/components/home/price-band-chips';
import { BrandRail } from '../../src/components/home/brand-rail';
import { OccasionTiles } from '../../src/components/home/occasion-tiles';
import { CustomerFavourites } from '../../src/components/home/customer-favourites';
import { ReferAndEarn } from '../../src/components/home/refer-and-earn';
import { LoyaltyProgress } from '../../src/components/home/loyalty-progress';
import { QuickReorderRail } from '../../src/components/home/quick-reorder-rail';
import { ScrollToTopFAB } from '../../src/components/home/scroll-to-top-fab';
import { EndOfFeed } from '../../src/components/home/end-of-feed';
import { queryKeys } from '../../src/lib/query-keys';
import { useWishlistQuery } from '../../src/lib/use-wishlist';

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  // Drives the marketplace header's scroll-collapse + shadow.
  const scrollY = useRef(new Animated.Value(0)).current;
  // Imperative ScrollView handle for the scroll-to-top FAB.
  const scrollRef = useRef<ScrollView>(null);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const flashDeals = useQuery({
    queryKey: queryKeys.products.flashDeals(),
    queryFn: () => productsApi.getFlashDeals(),
    staleTime: 5 * 60_000,
  });
  const featured = useQuery({
    queryKey: queryKeys.products.featured(),
    queryFn: () => productsApi.getFeaturedProducts(),
    staleTime: 5 * 60_000,
  });
  const allProducts = useQuery({
    queryKey: queryKeys.products.list({ limit: 50 }),
    queryFn: () => productsApi.getProducts({ limit: 50 }),
    staleTime: 5 * 60_000,
  });
  const wishlistQuery = useWishlistQuery();

  const products = allProducts.data?.products ?? [];

  const trendingProducts = products.filter((p) => p.isTrending);
  const newArrivals = useMemo(
    () =>
      [...products]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 12),
    [products],
  );
  const bestSellers = useMemo(
    () =>
      [...products]
        .sort((a, b) => b.reviewCount - a.reviewCount)
        .slice(0, 12),
    [products],
  );
  const topRated = useMemo(
    () => [...products].sort((a, b) => b.rating - a.rating).slice(0, 12),
    [products],
  );
  const underBudget = useMemo(
    () => products.filter((p) => p.price <= 299).slice(0, 12),
    [products],
  );

  // Pattern C — six rich tiles. We deliberately reuse already-fetched
  // queries so the tiles add zero network calls.
  const richTiles: RichTile[] = useMemo<RichTile[]>(
    () => [
      {
        id: 'favourites',
        title: 'Favourites',
        tint: 'bg-promo-peach-50',
        products: (wishlistQuery.data as Product[] | undefined) ?? topRated,
        href: '/wishlist',
        requiresAuth: false,
      },
      {
        id: 'daily-essentials',
        title: 'Daily essentials',
        tint: 'bg-promo-mint-50',
        products: featured.data,
        href: { pathname: '/search', params: { q: 'essentials' } },
      },
      {
        id: 'under-299',
        title: 'Under \u20B9299',
        tint: 'bg-promo-sunshine-50',
        products: underBudget,
        href: { pathname: '/search', params: { q: 'affordable' } },
      },
      {
        id: 'top-rated',
        title: 'Top rated',
        tint: 'bg-promo-lavender-50',
        products: topRated,
        href: { pathname: '/search', params: { q: 'top rated' } },
      },
      {
        id: 'just-for-you',
        title: 'Just for you',
        tint: 'bg-promo-teal-50',
        products: featured.data,
        href: { pathname: '/search', params: { q: 'recommended' } },
      },
      {
        id: 'new-launches',
        title: 'New launches',
        tint: 'bg-surface-warm',
        products: newArrivals,
        href: { pathname: '/search', params: { q: 'new' } },
      },
    ],
    [
      featured.data,
      newArrivals,
      topRated,
      underBudget,
      wishlistQuery.data,
    ],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // `invalidateQueries` returns immediately and only marks the
      // cache stale — refetches happen in the background. That made
      // the spinner toggle off before the data actually updated, so
      // the Android RefreshControl appeared to "stick" mid-pull. We
      // use `refetchQueries` (and the imperative `refetch()` for the
      // explicit query objects) which awaits the network round-trip
      // before resolving.
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['banners'] }),
        queryClient.refetchQueries({ queryKey: ['products'] }),
        queryClient.refetchQueries({ queryKey: ['categories'] }),
        queryClient.refetchQueries({ queryKey: queryKeys.wishlist.items() }),
        flashDeals.refetch(),
        featured.refetch(),
        allProducts.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, flashDeals, featured, allProducts]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-brand">
      <MarketplaceHeader scrollY={scrollY} />
      <Animated.ScrollView
        ref={scrollRef as never}
        className="flex-1 bg-surface-raised"
        contentContainerStyle={{ paddingBottom: 32, gap: 24 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#11ab3a"
            colors={['#11ab3a']}
          />
        }
      >
        <FadeIn delay={0} offsetY={10}>
          <View className="pt-4">
            <HeroCarousel />
          </View>
        </FadeIn>

        <FadeIn delay={60}>
          <CategoryStrip />
        </FadeIn>

        <FadeIn delay={120}>
          <FlashCountdownBanner
            products={flashDeals.data}
            isLoading={flashDeals.isLoading}
          />
        </FadeIn>

        <FadeIn delay={180}>
          <ProductRail
            title="Flash deals"
            subtitle="Lightning-fast prices, limited stock"
            products={flashDeals.data}
            isLoading={flashDeals.isLoading}
            accent="danger"
            onSeeAllPress={() =>
              router.push({ pathname: '/search', params: { q: 'deals' } })
            }
          />
        </FadeIn>

        <FadeIn delay={220}>
          <CouponStrip />
        </FadeIn>

        <SectionDivider label="Save more" />

        <FadeIn delay={260}>
          <CategoryTilesGrid
            tiles={richTiles}
            isLoading={allProducts.isLoading || featured.isLoading}
          />
        </FadeIn>

        <FadeIn delay={300}>
          <PriceBandChips />
        </FadeIn>

        <FadeIn delay={340}>
          <ProductRail
            title="Featured for you"
            subtitle="Editor-picked products"
            products={featured.data}
            isLoading={featured.isLoading}
            accent="accent"
          />
        </FadeIn>

        <FadeIn delay={380}>
          <BrandRail />
        </FadeIn>

        <FadeIn delay={420}>
          <CategoryGrid />
        </FadeIn>

        <SectionDivider label="Just for you" />

        <FadeIn delay={460}>
          <LoyaltyProgress />
        </FadeIn>

        <FadeIn delay={490}>
          <QuickReorderRail />
        </FadeIn>

        <FadeIn delay={520}>
          <RecentlyViewedRail />
        </FadeIn>

        <FadeIn delay={540}>
          <ProductRail
            title="Trending now"
            subtitle="What everyone's buying"
            products={trendingProducts}
            isLoading={allProducts.isLoading}
            accent="lavender"
          />
        </FadeIn>

        <SectionDivider label="Discover" />

        <FadeIn delay={580}>
          <OccasionTiles />
        </FadeIn>

        <FadeIn delay={620}>
          <ProductRail
            title="New arrivals"
            subtitle="Fresh in this week"
            products={newArrivals}
            isLoading={allProducts.isLoading}
            accent="primary"
          />
        </FadeIn>

        <FadeIn delay={660}>
          <CustomerFavourites />
        </FadeIn>

        <FadeIn delay={700}>
          <ProductRail
            title="Best sellers"
            subtitle="Most-reviewed favorites"
            products={bestSellers}
            isLoading={allProducts.isLoading}
            accent="teal"
          />
        </FadeIn>

        <FadeIn delay={740}>
          <ReferAndEarn />
        </FadeIn>

        <FadeIn delay={780}>
          <EndOfFeed onRefresh={onRefresh} />
        </FadeIn>
      </Animated.ScrollView>

      <ScrollToTopFAB scrollY={scrollY} onPress={scrollToTop} />
    </SafeAreaView>
  );
}
