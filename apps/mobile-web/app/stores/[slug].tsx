import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ShoppingBag,
  CheckCircle2,
  Star,
  Users,
} from 'lucide-react-native';
import { storesApi } from '@xelnova/api';
import { Button, Image, Pill, SectionHeader } from '@xelnova/ui-native';
import { ProductRail } from '../../src/components/product-rail';
import { queryKeys } from '../../src/lib/query-keys';
import { resolveImageUrl } from '../../src/lib/image-url';
import { formatCount } from '../../src/lib/format';

export default function StoreScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const storeQuery = useQuery({
    queryKey: queryKeys.store.detail(slug as string),
    queryFn: () => storesApi.getStore(slug as string),
    enabled: typeof slug === 'string' && slug.length > 0,
    staleTime: 5 * 60_000,
  });

  const dealsQuery = useQuery({
    queryKey: queryKeys.store.deals(slug as string),
    queryFn: () => storesApi.getStoreDeals(slug as string, 12),
    enabled: typeof slug === 'string' && slug.length > 0,
    staleTime: 5 * 60_000,
  });

  const bestsellersQuery = useQuery({
    queryKey: queryKeys.store.bestsellers(slug as string),
    queryFn: () => storesApi.getStoreBestsellers(slug as string, 12),
    enabled: typeof slug === 'string' && slug.length > 0,
    staleTime: 5 * 60_000,
  });

  const productsQuery = useQuery({
    queryKey: queryKeys.store.products(slug as string, { sort: 'newest' }),
    queryFn: () =>
      storesApi.getStoreProducts(slug as string, {
        sort: 'newest',
        page: 1,
        limit: 24,
      }),
    enabled: typeof slug === 'string' && slug.length > 0,
    staleTime: 5 * 60_000,
  });

  const store = storeQuery.data;
  const heroUri = useMemo(
    () => (store ? resolveImageUrl(store.heroBannerMobile ?? store.heroBannerUrl) : null),
    [store],
  );

  if (storeQuery.isLoading) {
    return (
      <View className="flex-1 bg-surface-raised items-center justify-center">
        <ActivityIndicator color="#11ab3a" />
      </View>
    );
  }

  if (!store) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-ink">Store not found</Text>
          <Button className="mt-4" onPress={() => router.back()}>
            Go back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="absolute top-0 left-0 right-0 z-10 px-3 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full bg-surface/90"
          hitSlop={6}
        >
          <ArrowLeft size={22} color="#1a1a2e" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="aspect-[16/9] bg-surface-muted">
          <Image uri={heroUri} className="w-full h-full" contentFit="cover" />
        </View>

        <View className="bg-surface px-4 pt-4 pb-5 -mt-6 mx-4 rounded-2xl border border-line-light gap-3">
          <View className="flex-row items-center gap-3">
            <View className="w-14 h-14 rounded-xl overflow-hidden bg-surface-muted">
              <Image
                uri={resolveImageUrl(store.logo)}
                className="w-full h-full"
                contentFit="contain"
              />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text
                  className="text-base font-bold text-ink flex-shrink"
                  numberOfLines={1}
                >
                  {store.storeName}
                </Text>
                {store.verified ? (
                  <CheckCircle2 size={14} color="#11ab3a" fill="#ecfdf3" />
                ) : null}
              </View>
              {store.location ? (
                <Text className="text-xs text-ink-secondary" numberOfLines={1}>
                  {store.location}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="flex-row gap-2 flex-wrap">
            {store.rating ? (
              <Pill tone="success" size="md" icon={<Star size={12} color="#047857" fill="#047857" />}>
                {`${store.rating.toFixed(1)} rating`}
              </Pill>
            ) : null}
            <Pill tone="primary" size="md" icon={<ShoppingBag size={12} color="#0c831f" />}>
              {`${formatCount(store.productCount ?? 0)} products`}
            </Pill>
            {typeof store.followers === 'number' ? (
              <Pill tone="info" size="md" icon={<Users size={12} color="#2563eb" />}>
                {`${formatCount(store.followers)} followers`}
              </Pill>
            ) : null}
          </View>

          {store.description ? (
            <Text
              className="text-sm text-ink-secondary leading-relaxed"
              numberOfLines={3}
            >
              {store.description}
            </Text>
          ) : null}
        </View>

        {store.featuredProducts && store.featuredProducts.length > 0 ? (
          <View className="mt-6">
            <ProductRail
              title="Featured by store"
              products={store.featuredProducts}
            />
          </View>
        ) : null}

        {dealsQuery.data && dealsQuery.data.length > 0 ? (
          <View className="mt-6">
            <ProductRail
              title="Store deals"
              subtitle="Special prices on this store"
              products={dealsQuery.data}
              isLoading={dealsQuery.isLoading}
            />
          </View>
        ) : null}

        {bestsellersQuery.data && bestsellersQuery.data.length > 0 ? (
          <View className="mt-6">
            <ProductRail
              title="Best sellers"
              products={bestsellersQuery.data}
              isLoading={bestsellersQuery.isLoading}
            />
          </View>
        ) : null}

        <View className="mt-6">
          <SectionHeader title="All products" />
          <View className="px-4 mt-2 flex-row flex-wrap gap-3">
            {(productsQuery.data?.items ?? []).slice(0, 6).map((p) => (
              <Pressable
                key={p.id}
                onPress={() =>
                  router.push({
                    pathname: '/products/[slug]',
                    params: { slug: p.slug },
                  })
                }
                className="w-[48%] bg-surface rounded-2xl border border-line-light overflow-hidden"
              >
                <View className="aspect-square bg-surface-muted">
                  <Image
                    uri={resolveImageUrl(p.images?.[0])}
                    className="w-full h-full"
                    contentFit="contain"
                  />
                </View>
                <View className="p-3">
                  <Text className="text-sm text-ink" numberOfLines={2}>
                    {p.name}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
          {(productsQuery.data?.total ?? 0) > 6 ? (
            <View className="px-4 mt-3">
              <Button
                variant="outline"
                fullWidth
                onPress={() =>
                  router.push({
                    pathname: '/search',
                    params: { q: store.storeName },
                  })
                }
              >
                {`View all ${productsQuery.data?.total ?? 0} products`}
              </Button>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
