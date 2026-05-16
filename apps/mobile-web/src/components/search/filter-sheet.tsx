import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Check, X } from 'lucide-react-native';
import { Button, Stars } from '@xelnova/ui-native';
import type { SearchFilters } from './types';

const SORT_OPTIONS: Array<{ value: NonNullable<SearchFilters['sortBy']>; label: string }> = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Customer rating' },
  { value: 'newest', label: 'Newest first' },
];

const PRICE_BUCKETS: Array<{ label: string; min?: number; max?: number }> = [
  { label: 'Under \u20B9500', max: 500 },
  { label: '\u20B9500 - \u20B91,000', min: 500, max: 1000 },
  { label: '\u20B91,000 - \u20B92,500', min: 1000, max: 2500 },
  { label: '\u20B92,500 - \u20B95,000', min: 2500, max: 5000 },
  { label: 'Over \u20B95,000', min: 5000 },
];

const RATING_OPTIONS = [4, 3, 2, 1];

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  initial: SearchFilters;
  brands?: string[];
  /** Current applied filters get reset to these defaults via the Clear all button. */
  defaults?: SearchFilters;
  onApply: (next: SearchFilters) => void;
}

export function FilterSheet({
  visible,
  onClose,
  initial,
  brands = [],
  defaults = {},
  onApply,
}: FilterSheetProps) {
  const [draft, setDraft] = useState<SearchFilters>(initial);

  useEffect(() => {
    if (visible) setDraft(initial);
  }, [initial, visible]);

  const matchesBucket = (bucket: { min?: number; max?: number }) =>
    draft.minPrice === bucket.min && draft.maxPrice === bucket.max;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-surface rounded-t-3xl max-h-[88%] gap-3">
          <View className="flex-row items-center justify-between px-5 pt-4">
            <Text className="text-base font-bold text-ink">Sort & filter</Text>
            <Pressable
              onPress={onClose}
              hitSlop={6}
              className="w-9 h-9 items-center justify-center rounded-full active:bg-surface-muted"
            >
              <X size={18} color="#1a1a2e" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 24 }}>
            <Section title="Sort by">
              <View className="gap-2">
                {SORT_OPTIONS.map((opt) => {
                  const selected = (draft.sortBy ?? 'relevance') === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() =>
                        setDraft((d) => ({ ...d, sortBy: opt.value }))
                      }
                      className="flex-row items-center justify-between active:opacity-60"
                    >
                      <Text className="text-sm text-ink">{opt.label}</Text>
                      <View
                        className={
                          selected
                            ? 'w-5 h-5 rounded-full bg-primary-500 items-center justify-center'
                            : 'w-5 h-5 rounded-full border border-line'
                        }
                      >
                        {selected ? <Check size={12} color="#ffffff" /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </Section>

            <Section title="Price range">
              <View className="flex-row flex-wrap gap-2">
                {PRICE_BUCKETS.map((bucket) => {
                  const active = matchesBucket(bucket);
                  return (
                    <Pressable
                      key={bucket.label}
                      onPress={() =>
                        setDraft((d) => ({
                          ...d,
                          minPrice: active ? undefined : bucket.min,
                          maxPrice: active ? undefined : bucket.max,
                        }))
                      }
                      className={`px-3 h-9 items-center justify-center rounded-full border ${
                        active
                          ? 'bg-primary-50 border-primary-500'
                          : 'bg-surface border-line-light'
                      } active:opacity-80`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          active ? 'text-primary-700' : 'text-ink'
                        }`}
                      >
                        {bucket.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Section>

            <Section title="Customer rating">
              <View className="gap-2">
                {RATING_OPTIONS.map((stars) => {
                  const active = draft.minRating === stars;
                  return (
                    <Pressable
                      key={stars}
                      onPress={() =>
                        setDraft((d) => ({
                          ...d,
                          minRating: active ? undefined : stars,
                        }))
                      }
                      className="flex-row items-center justify-between active:opacity-60"
                    >
                      <View className="flex-row items-center gap-2">
                        <Stars value={stars} size={14} />
                        <Text className="text-sm text-ink">{`${stars} & up`}</Text>
                      </View>
                      <View
                        className={
                          active
                            ? 'w-5 h-5 rounded-full bg-primary-500 items-center justify-center'
                            : 'w-5 h-5 rounded-full border border-line'
                        }
                      >
                        {active ? <Check size={12} color="#ffffff" /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </Section>

            {brands.length > 0 ? (
              <Section title="Brand">
                <View className="flex-row flex-wrap gap-2">
                  {brands.slice(0, 24).map((brand) => {
                    const active = draft.brand === brand;
                    return (
                      <Pressable
                        key={brand}
                        onPress={() =>
                          setDraft((d) => ({
                            ...d,
                            brand: active ? undefined : brand,
                          }))
                        }
                        className={`px-3 h-9 items-center justify-center rounded-full border ${
                          active
                            ? 'bg-primary-50 border-primary-500'
                            : 'bg-surface border-line-light'
                        } active:opacity-80`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            active ? 'text-primary-700' : 'text-ink'
                          }`}
                        >
                          {brand}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Section>
            ) : null}
          </ScrollView>

          <View className="flex-row gap-3 px-5 pb-6 border-t border-line-light pt-3">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => {
                setDraft(defaults);
                onApply(defaults);
              }}
            >
              Clear all
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onPress={() => onApply(draft)}
            >
              Apply
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-3">
      <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
        {title}
      </Text>
      {children}
    </View>
  );
}
