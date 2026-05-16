import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi, type Category } from '@xelnova/api';
import { CategoryTile, SectionHeader, Skeleton } from '@xelnova/ui-native';
import { queryKeys } from '../../lib/query-keys';
import { resolveImageUrl } from '../../lib/image-url';

const ROTATING_TINTS = [
  'mint',
  'teal',
  'sunshine',
  'peach',
  'lavender',
  'warm',
] as const;

type Tint = (typeof ROTATING_TINTS)[number];

const tintFor = (idx: number): Tint => ROTATING_TINTS[idx % ROTATING_TINTS.length];

export function CategoryStrip() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.categories.all(),
    queryFn: () => categoriesApi.getCategories(),
    staleTime: 5 * 60_000,
  });

  const topLevel: Category[] = (data ?? []).filter((c) => !c.parentId);

  return (
    <View>
      <SectionHeader
        title="Shop by category"
        subtitle="Curated picks for everything you need"
        actionLabel="See all"
        onActionPress={() => router.push('/categories')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
      >
        {isLoading
          ? Array.from({ length: 8 }).map((_, idx) => (
              <View key={`sk-${idx}`} className="items-center gap-1.5">
                <Skeleton className="w-16 h-16 rounded-full" />
                <Skeleton className="w-12 h-3 rounded-md" />
              </View>
            ))
          : topLevel.map((cat, idx) => (
              <CategoryTile
                key={cat.id}
                category={{
                  id: cat.id,
                  name: cat.name,
                  imageUrl: resolveImageUrl(cat.image),
                }}
                shape="circle"
                tint={tintFor(idx)}
                onPress={() =>
                  router.push({
                    pathname: '/categories/[slug]',
                    params: { slug: cat.slug },
                  })
                }
              />
            ))}
      </ScrollView>
    </View>
  );
}
