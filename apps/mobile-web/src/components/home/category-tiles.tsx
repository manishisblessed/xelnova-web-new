import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Image,
  PressableScale,
  SectionHeader,
  Skeleton,
} from '@xelnova/ui-native';
import type { Product } from '@xelnova/api';
import { pickPrimaryImage } from '../../lib/image-url';
import { useRequireAuth } from '../../lib/require-auth';

/**
 * Map of legacy Tailwind tint class names to a 2-stop gradient. Letting
 * callers stay on the existing `tint` class keeps the home-screen wiring
 * unchanged while the visual moves from a flat tint to a soft gradient
 * — feels closer to Blinkit/Flipkart category tiles which use depth on
 * the surface rather than just a single pastel.
 */
const TINT_TO_GRADIENT: Record<string, [string, string]> = {
  'bg-promo-peach-50': ['#fff5f5', '#fdd9d3'],
  'bg-promo-mint-50': ['#f3fff7', '#cdebd9'],
  'bg-promo-sunshine-50': ['#fff9d9', '#ffe9a1'],
  'bg-promo-lavender-50': ['#f9f7ff', '#e3dafe'],
  'bg-promo-teal-50': ['#eaf9f8', '#bee5e1'],
  'bg-surface-warm': ['#fff7ee', '#ffe6c8'],
};
const DEFAULT_GRADIENT: [string, string] = ['#f8fafb', '#e8ecf1'];

export interface RichTile {
  id: string;
  title: string;
  /**
   * Tailwind tint class. Used as a key into the gradient table — the
   * tile renders an `expo-linear-gradient` with the matching from/to
   * stops. Unknown classes fall back to a neutral grey gradient.
   */
  tint: string;
  /** Source products for the 2 thumbnails + count badge. */
  products: Product[] | undefined;
  href: Href;
  requiresAuth?: boolean;
}

interface Props {
  tiles: RichTile[];
  isLoading?: boolean;
  /** Section title above the 3-column grid. */
  title?: string;
  /** Section sub-title. */
  subtitle?: string;
  /** "See all" handler — falls through to nothing when undefined. */
  onSeeAllPress?: () => void;
}

/**
 * Pattern C — "Frequently bought" style tiles. Each tile shows two
 * stacked product thumbnails on the left, a "+N more" count chip and a
 * bold title underneath. Tapping the tile routes to the underlying
 * filtered listing.
 *
 * Pure presentation — caller wires the data + destinations.
 */
export function CategoryTilesGrid({
  tiles,
  isLoading,
  title = 'Frequently bought',
  subtitle,
  onSeeAllPress,
}: Props) {
  const router = useRouter();
  const requireAuth = useRequireAuth();

  if (!isLoading && tiles.length === 0) return null;

  return (
    <View>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        actionLabel={onSeeAllPress ? 'See all' : undefined}
        onActionPress={onSeeAllPress}
      />
      <View className="px-4">
        <View className="flex-row flex-wrap -mx-1.5">
          {(isLoading && tiles.length === 0
            ? Array.from({ length: 6 }).map((_, idx) => ({
                id: `sk-${idx}`,
                placeholder: true as const,
              }))
            : tiles.map((t) => ({ ...t, placeholder: false as const }))
          ).map((t) => (
            <View key={t.id} className="w-1/3 px-1.5 mb-3">
              {t.placeholder ? (
                <Skeleton className="aspect-[1/1.05] w-full rounded-2xl" />
              ) : (
                <RichTileCell
                  tile={t as RichTile}
                  onPress={() => {
                    const tile = t as RichTile;
                    if (tile.requiresAuth) {
                      requireAuth(tile.href, () => router.push(tile.href));
                    } else {
                      router.push(tile.href);
                    }
                  }}
                />
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function RichTileCell({
  tile,
  onPress,
}: {
  tile: RichTile;
  onPress: () => void;
}) {
  const previews = useMemo(
    () => (tile.products ?? []).slice(0, 2),
    [tile.products],
  );
  const total = tile.products?.length ?? 0;
  const extra = Math.max(0, total - previews.length);
  const gradient = TINT_TO_GRADIENT[tile.tint] ?? DEFAULT_GRADIENT;

  return (
    <PressableScale
      onPress={onPress}
      pressScale={0.94}
      style={{
        aspectRatio: 1 / 1.05,
        borderRadius: 18,
        overflow: 'hidden',
        // Soft drop shadow so the tonal tile reads as a raised card.
        shadowColor: '#0c831f',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, padding: 10 }}
      >
        <View className="flex-row gap-1.5 flex-1">
          {previews.length === 0 ? (
            <View className="flex-1 rounded-xl bg-surface/60" />
          ) : (
            previews.map((p, idx) => (
              <View
                key={p.id ?? idx}
                className="flex-1 rounded-xl overflow-hidden bg-surface"
              >
                <Image
                  uri={pickPrimaryImage(p.images)}
                  className="w-full h-full"
                  contentFit="contain"
                  fallbackLabel={p.brand ?? p.name}
                />
              </View>
            ))
          )}
        </View>
        {extra > 0 ? (
          <View className="absolute top-2.5 left-2.5 bg-surface/90 rounded-full px-1.5 py-0.5">
            <Text className="text-[10px] font-bold text-ink">
              {`+${extra} more`}
            </Text>
          </View>
        ) : null}
        <Text
          className="text-xs font-bold text-ink mt-1.5 text-center"
          numberOfLines={2}
        >
          {tile.title}
        </Text>
      </LinearGradient>
    </PressableScale>
  );
}
