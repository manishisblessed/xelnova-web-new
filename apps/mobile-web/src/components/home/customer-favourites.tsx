import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react-native';
import { productsApi } from '@xelnova/api';
import {
  Avatar,
  Image,
  PressableScale,
  SectionHeader,
  Skeleton,
} from '@xelnova/ui-native';
import { pickPrimaryImage, resolveImageUrl } from '../../lib/image-url';
import { queryKeys } from '../../lib/query-keys';

const CARD_WIDTH = 280;

/**
 * Customer favourites — a horizontal rail of recent 4-5★ reviews. Each
 * card shows the product thumbnail, review headline + comment snippet,
 * and the reviewer's avatar. Tapping a card opens the product page.
 *
 * Hides itself when the API returns no top reviews.
 */
export function CustomerFavourites() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.products.topReviews(),
    queryFn: () => productsApi.getTopReviews(),
    staleTime: 10 * 60_000,
  });

  const reviews = (data ?? []).slice(0, 8);
  if (!isLoading && reviews.length === 0) return null;

  return (
    <View>
      <SectionHeader
        title="What customers love"
        subtitle="Real reviews from happy buyers"
        accent="accent"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {isLoading && reviews.length === 0
          ? Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton
                key={`sk-${idx}`}
                className="rounded-2xl"
                style={{ width: CARD_WIDTH, height: 160 }}
              />
            ))
          : reviews.map((r) => (
              <PressableScale
                key={r.id}
                onPress={() =>
                  router.push({
                    pathname: '/products/[slug]',
                    params: { slug: r.product.slug },
                  })
                }
                pressScale={0.97}
                style={{
                  width: CARD_WIDTH,
                  borderRadius: 18,
                  backgroundColor: '#ffffff',
                  padding: 12,
                  shadowColor: '#0c831f',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 10,
                  elevation: 2,
                  borderWidth: 1,
                  borderColor: '#eef1f4',
                }}
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-14 h-14 rounded-xl overflow-hidden bg-surface">
                    <Image
                      uri={pickPrimaryImage(r.product.images)}
                      className="w-full h-full"
                      contentFit="contain"
                      fallbackLabel={r.product.name}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-ink" numberOfLines={1}>
                      {r.product.name}
                    </Text>
                    <View className="flex-row items-center gap-1 mt-0.5">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          size={11}
                          color="#f5b800"
                          fill={idx < Math.round(r.rating) ? '#f5b800' : 'transparent'}
                        />
                      ))}
                      <Text className="text-[11px] font-bold text-ink-secondary ml-0.5">
                        {r.rating.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                </View>

                {r.title ? (
                  <Text
                    className="text-sm font-bold text-ink mt-2.5"
                    numberOfLines={1}
                  >
                    {r.title}
                  </Text>
                ) : null}
                {r.comment ? (
                  <Text
                    className="text-xs text-ink-secondary mt-1 leading-5"
                    numberOfLines={2}
                  >
                    {`\u201C${r.comment.trim()}\u201D`}
                  </Text>
                ) : null}

                <View className="flex-row items-center gap-2 mt-3">
                  <Avatar
                    uri={resolveImageUrl(r.user.avatar)}
                    name={r.user.name}
                    size="sm"
                  />
                  <Text className="text-[11px] font-semibold text-ink" numberOfLines={1}>
                    {r.user.name}
                  </Text>
                  <View className="flex-1" />
                  {r.helpful > 0 ? (
                    <Text className="text-[10px] text-ink-secondary">
                      {`\uD83D\uDC4D ${r.helpful}`}
                    </Text>
                  ) : null}
                </View>
              </PressableScale>
            ))}
      </ScrollView>
    </View>
  );
}
