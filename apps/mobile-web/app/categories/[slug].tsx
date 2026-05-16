import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react-native';
import { categoriesApi, productsApi } from '@xelnova/api';
import { CategoryTile } from '@xelnova/ui-native';
import { ScreenHeader } from '../../src/components/screen-header';
import { ProductGrid } from '../../src/components/product-grid';
import { queryKeys } from '../../src/lib/query-keys';
import { resolveImageUrl } from '../../src/lib/image-url';
import { FilterSheet } from '../../src/components/search/filter-sheet';
import {
  countActiveFilters,
  describeActiveFilters,
  type SearchFilters,
} from '../../src/components/search/types';

export default function CategoryDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const categoryQuery = useQuery({
    queryKey: queryKeys.categories.bySlug(slug as string),
    queryFn: () => categoriesApi.getCategoryBySlug(slug as string),
    enabled: typeof slug === 'string' && slug.length > 0,
    staleTime: 5 * 60_000,
  });

  const [filters, setFilters] = useState<SearchFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filteredQuery = useQuery({
    queryKey: ['products', 'category', slug, filters],
    queryFn: () =>
      productsApi.getProducts({
        category: slug as string,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        minRating: filters.minRating,
        brand: filters.brand,
        sortBy: filters.sortBy === 'relevance' ? undefined : filters.sortBy,
        limit: 40,
      }),
    enabled:
      typeof slug === 'string' &&
      slug.length > 0 &&
      countActiveFilters(filters) > 0,
  });

  if (categoryQuery.isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <ScreenHeader title="Category" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#11ab3a" />
        </View>
      </SafeAreaView>
    );
  }

  const result = categoryQuery.data;
  if (!result) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <ScreenHeader title="Category" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-semibold text-ink">
            Category not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { category, products } = result;
  const subcategories = category.children ?? [];
  const activeFilters = countActiveFilters(filters);
  const list =
    activeFilters > 0
      ? (filteredQuery.data?.products ?? [])
      : products;
  const filterChips = describeActiveFilters(filters);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader
        title={category.name}
        subtitle={`${(category.productCount ?? products.length).toLocaleString('en-IN')} products`}
      />

      <View className="px-4 py-2 bg-surface border-b border-line-light flex-row items-center gap-2">
        <Pressable
          onPress={() => setFiltersOpen(true)}
          className="flex-row items-center gap-1.5 px-3 h-9 rounded-full bg-primary-50 active:opacity-80"
          hitSlop={4}
        >
          <SlidersHorizontal size={14} color="#0c831f" />
          <Text className="text-xs font-bold text-primary-700">
            {activeFilters > 0 ? `Filters \u00b7 ${activeFilters}` : 'Filters'}
          </Text>
        </Pressable>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          className="flex-1"
        >
          {filterChips.map((chip) => (
            <View
              key={chip}
              className="px-3 h-9 items-center justify-center rounded-full bg-surface-muted border border-line-light"
            >
              <Text className="text-xs text-ink">{chip}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <ProductGrid
        products={list}
        isLoading={
          activeFilters > 0 ? filteredQuery.isLoading : false
        }
        emptyTitle="No products to show"
        emptySubtitle="Try widening your filters"
        ListHeaderComponent={
          subcategories.length > 0 ? (
            <View className="px-4 pt-3 pb-1">
              <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold mb-2">
                Subcategories
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingRight: 12 }}
              >
                {subcategories.map((sub) => (
                  <CategoryTile
                    key={sub.id}
                    category={{
                      id: sub.id,
                      name: sub.name,
                      imageUrl: resolveImageUrl(sub.image),
                    }}
                    shape="square"
                    tint="mint"
                    onPress={() =>
                      router.push({
                        pathname: '/categories/[slug]',
                        params: { slug: sub.slug },
                      })
                    }
                  />
                ))}
              </ScrollView>
            </View>
          ) : undefined
        }
      />

      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        initial={filters}
        onApply={(next) => {
          setFilters(next);
          setFiltersOpen(false);
        }}
      />
    </SafeAreaView>
  );
}
