import { Text, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { cn } from './cn';

export interface RatingPillProps {
  rating: number;
  reviewCount?: number;
  /** `compact` shows only the number; `full` adds review count. */
  variant?: 'compact' | 'full';
  /** `solid` (green pill) for product cards, `soft` (white text on tinted) for hero. */
  tone?: 'solid' | 'soft';
  className?: string;
}

/**
 * Blinkit-style rating chip: green pill with star and rating value, optionally
 * followed by the review count. Shown on product cards and PDP hero.
 */
export function RatingPill({
  rating,
  reviewCount,
  variant = 'compact',
  tone = 'solid',
  className,
}: RatingPillProps) {
  if (!rating || rating <= 0) return null;

  const toneStyles =
    tone === 'solid'
      ? 'bg-primary-500'
      : 'bg-surface border border-line-light';
  const textColor = tone === 'solid' ? 'text-white' : 'text-ink';
  const starColor = tone === 'solid' ? '#ffffff' : '#11ab3a';

  return (
    <View
      className={cn(
        'flex-row items-center self-start rounded-md px-1.5 py-0.5 gap-0.5',
        toneStyles,
        className,
      )}
    >
      <Text className={cn('text-xs font-semibold', textColor)}>
        {rating.toFixed(1)}
      </Text>
      <Star size={10} color={starColor} fill={starColor} />
      {variant === 'full' && reviewCount !== undefined && (
        <Text className={cn('ml-1 text-xs', tone === 'solid' ? 'text-white/90' : 'text-ink-muted')}>
          ({reviewCount > 999 ? `${(reviewCount / 1000).toFixed(1)}k` : reviewCount})
        </Text>
      )}
    </View>
  );
}
