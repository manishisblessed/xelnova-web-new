import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Timer } from 'lucide-react-native';
import { Image, PressableScale, Skeleton } from '@xelnova/ui-native';
import type { Product } from '@xelnova/api';
import { pickPrimaryImage } from '../../lib/image-url';
import { discountPercent, formatRupees } from '../../lib/format';

interface Props {
  products: Product[] | undefined;
  isLoading?: boolean;
}

/**
 * Picks the deal that ends soonest within the next 24h. Falls back to the
 * first flash deal if none have an explicit `flashDealEndsAt`. We synthesize
 * a "ends in 6h" countdown for products without an explicit timer so the
 * banner never looks empty — Blinkit/Amazon use a similar trick where the
 * timer resets per-session.
 */
function pickFeaturedDeal(products: Product[] | undefined): {
  product: Product;
  endsAt: number;
} | null {
  if (!products || products.length === 0) return null;
  const now = Date.now();
  const synthetic = now + 6 * 60 * 60 * 1000;

  let best: { product: Product; endsAt: number } | null = null;
  for (const p of products) {
    const deadline = p.flashDealEndsAt
      ? new Date(p.flashDealEndsAt).getTime()
      : synthetic;
    if (deadline <= now) continue;
    if (!best || deadline < best.endsAt) {
      best = { product: p, endsAt: deadline };
    }
  }
  return best ?? { product: products[0]!, endsAt: synthetic };
}

function formatRemaining(ms: number): { h: string; m: string; s: string } {
  const safe = Math.max(0, ms);
  const totalSec = Math.floor(safe / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return {
    h: String(h).padStart(2, '0'),
    m: String(m).padStart(2, '0'),
    s: String(s).padStart(2, '0'),
  };
}

/**
 * "Today's deal" countdown banner. Single hero deal with a live HH:MM:SS
 * timer ticking down. Tapping the card jumps to the product, tapping
 * "View all" opens the deals listing.
 */
export function FlashCountdownBanner({ products, isLoading }: Props) {
  const router = useRouter();
  const featured = useMemo(() => pickFeaturedDeal(products), [products]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (isLoading && !featured) {
    return (
      <View className="px-4">
        <Skeleton className="w-full h-[120px] rounded-2xl" />
      </View>
    );
  }
  if (!featured) return null;

  const { product, endsAt } = featured;
  const remaining = formatRemaining(endsAt - now);
  const off = discountPercent(product.price, product.compareAtPrice);

  return (
    <View className="px-4">
      <PressableScale
        onPress={() =>
          router.push({
            pathname: '/products/[slug]',
            params: { slug: product.slug },
          })
        }
        pressScale={0.97}
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          shadowColor: '#dc2626',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 14,
          elevation: 4,
        }}
      >
        <LinearGradient
          colors={['#fff1e0', '#ffd9b8', '#ffb69a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <View className="w-[88px] h-[88px] rounded-2xl bg-surface overflow-hidden">
            <Image
              uri={pickPrimaryImage(product.images)}
              className="w-full h-full"
              contentFit="contain"
              fallbackLabel={product.brand ?? product.name}
            />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center gap-1 mb-1">
              <Flame size={14} color="#dc2626" />
              <Text className="text-[11px] font-extrabold text-danger uppercase tracking-wider">
                Deal of the day
              </Text>
            </View>
            <Text
              className="text-sm font-bold text-ink"
              numberOfLines={2}
            >
              {product.name}
            </Text>
            <View className="flex-row items-baseline gap-2 mt-1">
              <Text className="text-base font-extrabold text-ink">
                {formatRupees(product.price)}
              </Text>
              {off ? (
                <Text className="text-[11px] font-bold text-success">
                  {`${off}% off`}
                </Text>
              ) : null}
            </View>

            <View className="flex-row items-center gap-1.5 mt-2">
              <Timer size={12} color="#7a2e0b" />
              <Text className="text-[11px] font-semibold text-[#7a2e0b]">
                Ends in
              </Text>
              <CountdownChip value={remaining.h} />
              <Text className="text-[11px] font-extrabold text-[#7a2e0b]">:</Text>
              <CountdownChip value={remaining.m} />
              <Text className="text-[11px] font-extrabold text-[#7a2e0b]">:</Text>
              <CountdownChip value={remaining.s} />
            </View>
          </View>
        </LinearGradient>

        <Pressable
          onPress={() =>
            router.push({ pathname: '/search', params: { q: 'deals' } })
          }
          className="bg-danger py-2 active:opacity-80"
          hitSlop={6}
        >
          <Text className="text-center text-xs font-extrabold text-surface uppercase tracking-wider">
            See all deals
          </Text>
        </Pressable>
      </PressableScale>
    </View>
  );
}

function CountdownChip({ value }: { value: string }) {
  return (
    <View className="bg-[#7a2e0b] rounded-md px-1.5 py-0.5 min-w-[24px]">
      <Text className="text-[11px] font-extrabold text-surface text-center">
        {value}
      </Text>
    </View>
  );
}
