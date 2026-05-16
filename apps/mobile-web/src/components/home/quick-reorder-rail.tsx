import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react-native';
import { ordersApi, type Order, type OrderItem } from '@xelnova/api';
import {
  Image,
  PressableScale,
  SectionHeader,
  Skeleton,
} from '@xelnova/ui-native';
import { useAuth } from '../../lib/auth-context';
import { queryKeys } from '../../lib/query-keys';
import { formatRupees } from '../../lib/format';
import { resolveImageUrl } from '../../lib/image-url';

const TILE_WIDTH = 130;
const MAX_ITEMS = 12;

interface ReorderTile {
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  /** Most recent order date for this product, used to label freshness. */
  orderedAt: string;
}

/**
 * Walks the user's orders newest → oldest and returns up to `MAX_ITEMS`
 * unique products. Falls back gracefully when the API returns an empty
 * list — the component will simply render nothing in that case.
 */
function pickReorderTiles(orders: Order[] | undefined): ReorderTile[] {
  if (!orders || orders.length === 0) return [];
  const seen = new Set<string>();
  const tiles: ReorderTile[] = [];
  for (const order of orders) {
    for (const item of order.items as OrderItem[]) {
      if (seen.has(item.productId)) continue;
      seen.add(item.productId);
      tiles.push({
        productId: item.productId,
        name: item.productName,
        price: item.price,
        imageUrl: resolveImageUrl(item.productImage),
        orderedAt: order.createdAt,
      });
      if (tiles.length >= MAX_ITEMS) return tiles;
    }
  }
  return tiles;
}

function relativeOrderDate(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const days = Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  } catch {
    return 'Recently';
  }
}

/**
 * "Buy it again" rail — auth-only. Replays the user's recent purchases
 * back at them as a fast-reorder strip. Hides for guests entirely so
 * the home page stays browse-first.
 *
 * Tiles route to `/search?q=<productName>` because OrderItem doesn't
 * carry a slug (we only persist a snapshot of name + image at order
 * time). That lands the user on a search page where they can re-find
 * the exact product.
 */
export function QuickReorderRail() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const ordersQuery = useQuery({
    queryKey: queryKeys.orders.list(),
    queryFn: () => ordersApi.getOrders(),
    enabled: isAuthenticated,
    retry: false,
    staleTime: 5 * 60_000,
  });

  const tiles = useMemo(
    () => pickReorderTiles(ordersQuery.data),
    [ordersQuery.data],
  );

  if (!isAuthenticated) return null;
  if (!ordersQuery.isLoading && tiles.length === 0) return null;

  return (
    <View>
      <SectionHeader
        title="Buy it again"
        subtitle="Re-order your favourites in one tap"
        accent="primary"
        actionLabel={tiles.length > 0 ? 'View orders' : undefined}
        onActionPress={() => router.push('/account/orders')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {ordersQuery.isLoading && tiles.length === 0
          ? Array.from({ length: 4 }).map((_, idx) => (
              <View key={`sk-${idx}`} style={{ width: TILE_WIDTH }}>
                <Skeleton
                  className="rounded-2xl"
                  style={{ width: TILE_WIDTH, height: TILE_WIDTH }}
                />
                <Skeleton className="w-24 h-3 rounded-md mt-2" />
                <Skeleton className="w-16 h-3 rounded-md mt-1.5" />
              </View>
            ))
          : tiles.map((t) => (
              <PressableScale
                key={t.productId}
                onPress={() =>
                  router.push({
                    pathname: '/search',
                    params: { q: t.name },
                  })
                }
                pressScale={0.95}
                style={{ width: TILE_WIDTH }}
              >
                <View
                  style={{
                    width: TILE_WIDTH,
                    height: TILE_WIDTH,
                    borderRadius: 16,
                    overflow: 'hidden',
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#eef1f4',
                    shadowColor: '#0c831f',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <Image
                    uri={t.imageUrl}
                    className="w-full h-full"
                    contentFit="contain"
                    fallbackLabel={t.name}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 6,
                      left: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 3,
                      backgroundColor: 'rgba(255,255,255,0.92)',
                      borderRadius: 999,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <RotateCcw size={9} color="#0c831f" />
                    <Text className="text-[9px] font-extrabold text-primary-700 uppercase">
                      {relativeOrderDate(t.orderedAt)}
                    </Text>
                  </View>
                </View>
                <Text
                  className="text-xs font-semibold text-ink mt-2"
                  numberOfLines={2}
                >
                  {t.name}
                </Text>
                <Text className="text-xs font-extrabold text-ink mt-0.5">
                  {formatRupees(t.price)}
                </Text>
              </PressableScale>
            ))}
      </ScrollView>
    </View>
  );
}
