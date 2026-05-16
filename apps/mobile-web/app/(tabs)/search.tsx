import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  Search as SearchIcon,
  SlidersHorizontal,
  TrendingUp,
  X,
} from 'lucide-react-native';
import { searchApi } from '@xelnova/api';
import { Pill } from '@xelnova/ui-native';
import { ProductGrid } from '../../src/components/product-grid';
import { queryKeys } from '../../src/lib/query-keys';
import { FilterSheet } from '../../src/components/search/filter-sheet';
import {
  countActiveFilters,
  describeActiveFilters,
  type SearchFilters,
} from '../../src/components/search/types';
import {
  clearRecentSearches,
  getRecentSearches,
  recordRecentSearch,
} from '../../src/lib/local-history';

const DEBOUNCE_MS = 300;

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const initialQuery = typeof params.q === 'string' ? params.q : '';

  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounced(query.trim(), DEBOUNCE_MS);
  const [submitted, setSubmitted] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>(() => ({
    category: typeof params.category === 'string' ? params.category : undefined,
  }));
  const [filtersOpen, setFiltersOpen] = useState(false);

  // When user is typing (and hasn't pressed enter), show autocomplete
  // suggestions. After enter, run a full search.
  const popular = useQuery({
    queryKey: queryKeys.search.popular(),
    queryFn: () => searchApi.getPopularSearches(),
    staleTime: 10 * 60_000,
  });

  const autocomplete = useQuery({
    queryKey: queryKeys.search.autocomplete(debouncedQuery),
    queryFn: () => searchApi.getAutocomplete(debouncedQuery),
    enabled: debouncedQuery.length >= 2 && submitted !== debouncedQuery,
    staleTime: 60_000,
  });

  const results = useQuery({
    queryKey: queryKeys.search.results(submitted, 1, filters),
    queryFn: () => searchApi.searchProducts(submitted, 1, undefined, filters),
    enabled: submitted.length >= 2,
    staleTime: 60_000,
  });

  const availableBrands = useMemo<string[]>(() => {
    const f = (results.data as any)?.filters;
    return Array.isArray(f?.brands) ? (f.brands as string[]) : [];
  }, [results.data]);

  const filterChips = describeActiveFilters(filters);
  const filterCount = countActiveFilters(filters);

  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const refreshRecentSearches = useCallback(async () => {
    setRecentSearches(await getRecentSearches());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshRecentSearches();
    }, [refreshRecentSearches]),
  );

  const submitSearch = (q?: string) => {
    const next = (q ?? query).trim();
    if (!next) return;
    setQuery(next);
    setSubmitted(next);
    recordRecentSearch(next).then(refreshRecentSearches);
  };

  const onClearRecent = async () => {
    await clearRecentSearches();
    refreshRecentSearches();
  };

  const showResults = submitted.length >= 2;
  const acProducts = useMemo(() => {
    const ac = autocomplete.data as
      | { products?: Array<{ id?: string; name?: string; slug?: string }>; categories?: Array<{ id?: string; name?: string; slug?: string }> }
      | undefined;
    return ac?.products ?? [];
  }, [autocomplete.data]);
  const acCategories = useMemo(() => {
    const ac = autocomplete.data as
      | { products?: unknown[]; categories?: Array<{ id?: string; name?: string; slug?: string }> }
      | undefined;
    return ac?.categories ?? [];
  }, [autocomplete.data]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <View className="bg-surface border-b border-line-light px-3 py-2 flex-row items-center gap-2">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full active:bg-surface-muted"
          hitSlop={6}
        >
          <ArrowLeft size={22} color="#1a1a2e" />
        </Pressable>
        <View className="flex-1 flex-row items-center bg-surface-muted rounded-xl px-3 h-11 border border-line-light">
          <SearchIcon size={18} color="#5a6478" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => submitSearch()}
            returnKeyType="search"
            autoFocus
            placeholder="Search for products, brands, stores"
            placeholderTextColor="#8d95a5"
            className="flex-1 ml-2 text-sm text-ink"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={6}>
              <X size={18} color="#5a6478" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {showResults ? (
        <View className="flex-1">
          <View className="px-4 py-2 bg-surface border-b border-line-light flex-row items-center gap-2">
            <Pressable
              onPress={() => setFiltersOpen(true)}
              className="flex-row items-center gap-1.5 px-3 h-9 rounded-full bg-primary-50 active:opacity-80"
              hitSlop={4}
            >
              <SlidersHorizontal size={14} color="#0c831f" />
              <Text className="text-xs font-bold text-primary-700">
                {filterCount > 0 ? `Filters \u00b7 ${filterCount}` : 'Filters'}
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
            products={results.data?.products ?? []}
            isLoading={results.isLoading}
            emptyTitle={`No matches for "${submitted}"`}
            emptySubtitle="Try a different keyword or adjust your filters"
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, gap: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {acProducts.length > 0 || acCategories.length > 0 ? (
            <View className="gap-3">
              <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
                Suggestions
              </Text>
              {acCategories.slice(0, 4).map((cat) => {
                const id = cat.id ?? cat.slug ?? cat.name ?? Math.random().toString();
                return (
                  <Pressable
                    key={`cat-${id}`}
                    onPress={() => {
                      if (cat.slug) {
                        setFilters((f) => ({ ...f, category: cat.slug }));
                      }
                      submitSearch(cat.name ?? '');
                    }}
                    className="flex-row items-center gap-3 py-2 active:opacity-60"
                  >
                    <View className="w-8 h-8 rounded-full bg-promo-mint-50 items-center justify-center">
                      <SearchIcon size={14} color="#11ab3a" />
                    </View>
                    <Text className="text-sm text-ink">
                      {cat.name}{' '}
                      <Text className="text-ink-muted">in categories</Text>
                    </Text>
                  </Pressable>
                );
              })}
              {acProducts.slice(0, 6).map((prd) => {
                const id = prd.id ?? prd.slug ?? prd.name ?? Math.random().toString();
                return (
                  <Pressable
                    key={`prd-${id}`}
                    onPress={() => {
                      if (prd.slug) {
                        router.push({
                          pathname: '/products/[slug]',
                          params: { slug: prd.slug },
                        });
                      } else {
                        submitSearch(prd.name ?? '');
                      }
                    }}
                    className="flex-row items-center gap-3 py-2 active:opacity-60"
                  >
                    <View className="w-8 h-8 rounded-full bg-surface-muted items-center justify-center">
                      <SearchIcon size={14} color="#5a6478" />
                    </View>
                    <Text className="text-sm text-ink flex-1" numberOfLines={1}>
                      {prd.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {recentSearches.length > 0 ? (
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Clock size={16} color="#5a6478" />
                  <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
                    Recent searches
                  </Text>
                </View>
                <Pressable onPress={onClearRecent} hitSlop={4}>
                  <Text className="text-xs font-semibold text-primary-600">
                    Clear
                  </Text>
                </Pressable>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <Pressable key={term} onPress={() => submitSearch(term)}>
                    <View className="flex-row items-center gap-1 rounded-full bg-surface-muted border border-line-light px-3 h-8">
                      <Clock size={12} color="#5a6478" />
                      <Text className="text-xs text-ink">{term}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {popular.data && popular.data.length > 0 ? (
            <View className="gap-3">
              <View className="flex-row items-center gap-2">
                <TrendingUp size={16} color="#11ab3a" />
                <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
                  Popular searches
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {popular.data.map((term: string) => (
                  <Pressable key={term} onPress={() => submitSearch(term)}>
                    <Pill tone="primary" size="md">
                      {term}
                    </Pill>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}

      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        initial={filters}
        brands={availableBrands}
        onApply={(next) => {
          setFilters(next);
          setFiltersOpen(false);
        }}
      />
    </SafeAreaView>
  );
}
