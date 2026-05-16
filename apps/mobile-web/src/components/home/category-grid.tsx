import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MoreHorizontal } from 'lucide-react-native';
import { categoriesApi, type Category } from '@xelnova/api';
import { Image, SectionHeader, Skeleton } from '@xelnova/ui-native';
import { queryKeys } from '../../lib/query-keys';
import { resolveImageUrl } from '../../lib/image-url';

const ROTATING_TINTS = [
  'bg-promo-mint-50',
  'bg-promo-teal-50',
  'bg-promo-sunshine-50',
  'bg-promo-peach-50',
  'bg-promo-lavender-50',
  'bg-surface-warm',
] as const;

const SLOTS = 12;

/**
 * Pattern D — Amazon-style 2×6 static category grid. Surfaces 11
 * top-level categories at once + a "More" tile that routes to
 * `/categories`. Auto-collapses when fewer categories are available.
 */
export function CategoryGrid() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.categories.all(),
    queryFn: () => categoriesApi.getCategories(),
    staleTime: 5 * 60_000,
  });

  const topLevel: Category[] = (data ?? []).filter((c) => !c.parentId);
  const visible = topLevel.slice(0, SLOTS - 1);

  return (
    <View>
      <SectionHeader
        title="All categories"
        subtitle="Browse everything Xelnova carries"
        actionLabel="See all"
        onActionPress={() => router.push('/categories')}
      />
      <View className="px-4">
        <View className="flex-row flex-wrap -mx-1.5">
          {isLoading && visible.length === 0
            ? Array.from({ length: SLOTS }).map((_, idx) => (
                <View key={`sk-${idx}`} className="w-1/6 px-1.5 mb-4 items-center gap-1.5">
                  <Skeleton className="w-14 h-14 rounded-full" />
                  <Skeleton className="w-10 h-3 rounded-md" />
                </View>
              ))
            : visible.map((cat, idx) => (
                <View key={cat.id} className="w-1/6 px-1.5 mb-4 items-center gap-1.5">
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/categories/[slug]',
                        params: { slug: cat.slug },
                      })
                    }
                    className={`w-14 h-14 rounded-full items-center justify-center ${ROTATING_TINTS[idx % ROTATING_TINTS.length]} active:opacity-80`}
                  >
                    <Image
                      uri={resolveImageUrl(cat.image)}
                      className="w-10 h-10"
                      contentFit="contain"
                    />
                  </Pressable>
                  <Text
                    className="text-[10px] font-semibold text-ink text-center max-w-[64px]"
                    numberOfLines={2}
                  >
                    {cat.name}
                  </Text>
                </View>
              ))}

          {/* "More" tile always lives in the last slot when we have any
              top-level categories at all. */}
          {!isLoading && topLevel.length > 0 ? (
            <View className="w-1/6 px-1.5 mb-4 items-center gap-1.5">
              <Pressable
                onPress={() => router.push('/categories')}
                className="w-14 h-14 rounded-full items-center justify-center bg-surface-muted active:opacity-80"
              >
                <MoreHorizontal size={22} color="#1a1a2e" />
              </Pressable>
              <Text className="text-[10px] font-semibold text-ink text-center">
                More
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
