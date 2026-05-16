import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@xelnova/api';
import {
  Image,
  PressableScale,
  SectionHeader,
  Skeleton,
} from '@xelnova/ui-native';
import { resolveImageUrl } from '../../lib/image-url';
import { queryKeys } from '../../lib/query-keys';

const BRAND_TILE = 84;

/**
 * Top brands rail — shows up to 12 logo tiles. Tapping a brand jumps to a
 * `?brand=<slug>` search so the user lands on a pre-filtered grid.
 *
 * Renders nothing if the API returns an empty list (no brands configured).
 */
export function BrandRail() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.products.brands(),
    queryFn: () => productsApi.getBrands(),
    staleTime: 30 * 60_000,
  });

  const brands = (data ?? []).slice(0, 12);
  if (!isLoading && brands.length === 0) return null;

  return (
    <View>
      <SectionHeader
        title="Top brands"
        subtitle="Trusted names, tap to explore"
        accent="teal"
        actionLabel={brands.length > 0 ? 'See all' : undefined}
        onActionPress={() => router.push('/categories')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {isLoading && brands.length === 0
          ? Array.from({ length: 8 }).map((_, idx) => (
              <View key={`sk-${idx}`} className="items-center gap-1.5">
                <Skeleton
                  className="rounded-2xl"
                  style={{ width: BRAND_TILE, height: BRAND_TILE }}
                />
                <Skeleton className="w-14 h-3 rounded-md" />
              </View>
            ))
          : brands.map((b) => (
              <PressableScale
                key={b.id}
                onPress={() =>
                  router.push({
                    pathname: '/search',
                    params: { brand: b.slug },
                  })
                }
                pressScale={0.94}
                style={{ alignItems: 'center', gap: 6 }}
              >
                <View
                  style={{
                    width: BRAND_TILE,
                    height: BRAND_TILE,
                    borderRadius: 18,
                    backgroundColor: '#ffffff',
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 10,
                    shadowColor: '#0c831f',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 2,
                    borderWidth: 1,
                    borderColor: '#eef1f4',
                  }}
                >
                  <Image
                    uri={resolveImageUrl(b.logo)}
                    className="w-full h-full"
                    contentFit="contain"
                    fallbackLabel={b.name}
                  />
                </View>
                <Text
                  className="text-[11px] font-semibold text-ink"
                  numberOfLines={1}
                  style={{ width: BRAND_TILE, textAlign: 'center' }}
                >
                  {b.name}
                </Text>
              </PressableScale>
            ))}
      </ScrollView>
    </View>
  );
}
