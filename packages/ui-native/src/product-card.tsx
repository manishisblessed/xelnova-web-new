import { Pressable, Text, View } from 'react-native';
import { AnimatedHeart } from './animated-heart';
import { cn } from './cn';
import { Image } from './image';
import { PressableScale } from './pressable-scale';
import { Price } from './price';
import { RatingPill } from './rating-pill';
import { Ribbon, type RibbonTone } from './ribbon';

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  compareAtPrice?: number | null;
  rating?: number;
  reviewCount?: number;
  brand?: string | null;
  /**
   * Short tag e.g. "Deal", "New", "Bestseller". When passed as an object
   * the `tone` controls the ribbon palette; passing a plain string falls
   * back to the `deal` tone for backwards compatibility.
   */
  badge?: string | { label: string; tone?: RibbonTone } | null;
  /** True when product is out of stock. */
  outOfStock?: boolean;
}

export interface ProductCardProps {
  product: ProductCardData;
  /** `grid` for 2-col vertical grids; `rail` for horizontal scrolling rails. */
  layout?: 'grid' | 'rail';
  onPress?: () => void;
  onAddPress?: () => void;
  /** Show "ADD" CTA at the bottom (Blinkit-style). Hidden by default. */
  showAdd?: boolean;
  /**
   * Optional wishlist heart overlay. When provided, renders an animated
   * Heart in the top-right corner of the image. Tap fires `onToggle`
   * with no arguments — the consumer mutates the product. Pass `null`
   * (or omit) to hide the overlay entirely.
   */
  wishlist?: { active: boolean; onToggle: () => void } | null;
  className?: string;
}

const layoutWidth = {
  grid: 'w-full',
  rail: 'w-40',
} as const;

/**
 * Blinkit-leaning product tile. Optimized for fast vertical scrolling in
 * search results and home rails. Image fills the top with a soft tinted
 * background to mimic the marketplace look.
 */
export function ProductCard({
  product,
  layout = 'grid',
  onPress,
  onAddPress,
  showAdd = false,
  wishlist,
  className,
}: ProductCardProps) {
  return (
    <PressableScale
      onPress={onPress}
      className={cn(
        'rounded-2xl bg-surface border border-line-light overflow-hidden',
        layoutWidth[layout],
        className,
      )}
      style={{
        // Soft drop shadow gives the card a light "lift" so the rail
        // reads as elevated above the page surface.
        shadowColor: '#0c831f',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      <View className="relative aspect-square">
        <Image
          uri={product.imageUrl}
          className="w-full h-full"
          contentFit="contain"
          fallbackLabel={product.brand ?? product.name}
        />
        {product.badge ? (
          <Ribbon
            label={
              typeof product.badge === 'string'
                ? product.badge
                : product.badge.label
            }
            tone={
              typeof product.badge === 'string'
                ? inferToneFromLabel(product.badge)
                : product.badge.tone ?? inferToneFromLabel(product.badge.label)
            }
          />
        ) : null}
        {product.outOfStock ? (
          <View className="absolute inset-0 items-center justify-center bg-surface/70">
            <Text className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">
              Out of stock
            </Text>
          </View>
        ) : null}
        {wishlist ? (
          <View
            className="absolute top-1.5 right-1.5 w-8 h-8 items-center justify-center rounded-full bg-surface/90"
            style={{
              shadowColor: '#0c831f',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <AnimatedHeart
              active={wishlist.active}
              onToggle={wishlist.onToggle}
              size={16}
              hitSlop={6}
            />
          </View>
        ) : null}
      </View>

      <View className="p-3 gap-1.5">
        {product.rating && product.rating > 0 ? (
          <RatingPill
            rating={product.rating}
            reviewCount={product.reviewCount}
            variant="full"
          />
        ) : null}
        {product.brand ? (
          <Text className="text-[10px] text-ink-muted uppercase tracking-wide" numberOfLines={1}>
            {product.brand}
          </Text>
        ) : null}
        <Text
          className="text-sm text-ink leading-tight"
          numberOfLines={2}
        >
          {product.name}
        </Text>
        <Price
          amount={product.price}
          compareAt={product.compareAtPrice}
          size="sm"
        />
        {showAdd && !product.outOfStock ? (
          <Pressable
            onPress={onAddPress}
            className="mt-1 self-start rounded-md border-2 border-primary-500 px-3 py-1 active:bg-primary-50"
            hitSlop={6}
          >
            <Text className="text-xs font-bold text-primary-600 tracking-wide">
              ADD
            </Text>
          </Pressable>
        ) : null}
      </View>
    </PressableScale>
  );
}

/**
 * Heuristic mapping from the legacy free-text badge to a ribbon tone so
 * existing callers (pre-tone) still get a sensible color. Anything we
 * don't recognize falls back to the loud red "deal" tone.
 */
function inferToneFromLabel(label: string): RibbonTone {
  const l = label.toLowerCase();
  if (l.includes('new')) return 'new';
  if (l.includes('best')) return 'bestseller';
  if (l.includes('limit')) return 'limited';
  if (l.includes('trend')) return 'trending';
  if (l.includes('fresh')) return 'fresh';
  return 'deal';
}
