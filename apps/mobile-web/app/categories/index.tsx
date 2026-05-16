import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Tag } from 'lucide-react-native';
import { categoriesApi, type Category } from '@xelnova/api';
import { CategoryTile, EmptyState } from '@xelnova/ui-native';
import { ScreenHeader } from '../../src/components/screen-header';
import { queryKeys } from '../../src/lib/query-keys';
import { resolveImageUrl } from '../../src/lib/image-url';

/**
 * Top-level category browse. Categories whose `parentId === null` are
 * rendered as a 3-column grid with their image; everything else lives one
 * level deeper inside `categories/[slug]`.
 */
export default function CategoriesScreen() {
  const router = useRouter();

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories.all(),
    queryFn: () => categoriesApi.getCategories(),
    staleTime: 10 * 60_000,
  });

  if (categoriesQuery.isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <ScreenHeader title="Categories" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#11ab3a" />
        </View>
      </SafeAreaView>
    );
  }

  const all = categoriesQuery.data ?? [];
  const tops = all.filter((c) => !c.parentId);

  if (tops.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <ScreenHeader title="Categories" />
        <View className="flex-1 items-center justify-center px-6">
          <EmptyState
            icon={<Tag size={36} color="#11ab3a" />}
            title="No categories yet"
            subtitle="Check back soon."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader
        title="Categories"
        subtitle={`${tops.length} top categories`}
      />
      <FlatList
        data={tops}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <TopCategoryRow
            category={item}
            children={all.filter((c) => c.parentId === item.id).slice(0, 4)}
            onPress={() =>
              router.push({
                pathname: '/categories/[slug]',
                params: { slug: item.slug },
              })
            }
            onChildPress={(child) =>
              router.push({
                pathname: '/categories/[slug]',
                params: { slug: child.slug },
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

function TopCategoryRow({
  category,
  children,
  onPress,
  onChildPress,
}: {
  category: Category;
  children: Category[];
  onPress: () => void;
  onChildPress: (c: Category) => void;
}) {
  return (
    <View className="bg-surface rounded-2xl border border-line-light overflow-hidden">
      <Pressable
        onPress={onPress}
        className="flex-row items-center gap-3 p-3 active:opacity-80"
      >
        <CategoryTile
          category={{
            id: category.id,
            name: category.name,
            imageUrl: resolveImageUrl(category.image),
          }}
          shape="square"
          tint="mint"
        />
        <View className="flex-1">
          <Text className="text-sm font-bold text-ink">{category.name}</Text>
          {typeof category.productCount === 'number' && category.productCount > 0 ? (
            <Text className="text-xs text-ink-muted mt-0.5">
              {`${category.productCount.toLocaleString('en-IN')} products`}
            </Text>
          ) : null}
        </View>
        <ChevronRight size={18} color="#8d95a5" />
      </Pressable>
      {children.length > 0 ? (
        <View className="border-t border-line-light px-3 py-3 flex-row flex-wrap gap-2">
          {children.map((child) => (
            <Pressable
              key={child.id}
              onPress={() => onChildPress(child)}
              className="px-3 h-8 items-center justify-center rounded-full bg-surface-muted active:opacity-80"
            >
              <Text className="text-xs font-semibold text-ink">{child.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
