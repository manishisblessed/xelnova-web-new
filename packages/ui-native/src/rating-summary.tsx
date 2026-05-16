import { Text, View } from 'react-native';
import { cn } from './cn';
import { Stars } from './stars';

interface RatingDistributionItem {
  star: number;
  count: number;
}

export interface RatingSummaryProps {
  avgRating: number;
  totalReviews: number;
  distribution?: RatingDistributionItem[];
  className?: string;
}

/**
 * Aggregate rating block used on product detail. Combines the average + total
 * count with a small horizontal-bar histogram of the per-star distribution.
 */
export function RatingSummary({
  avgRating,
  totalReviews,
  distribution,
  className,
}: RatingSummaryProps) {
  const dist = distribution ?? [];
  const max = Math.max(1, ...dist.map((d) => d.count));

  return (
    <View
      className={cn(
        'flex-row gap-5 bg-surface rounded-2xl border border-line-light p-4',
        className,
      )}
    >
      <View className="items-center justify-center min-w-[88px] gap-1.5">
        <Text className="text-3xl font-bold text-ink">
          {avgRating.toFixed(1)}
        </Text>
        <Stars value={avgRating} size={14} />
        <Text className="text-xs text-ink-muted">
          {`${totalReviews.toLocaleString('en-IN')} ${totalReviews === 1 ? 'review' : 'reviews'}`}
        </Text>
      </View>
      {dist.length > 0 ? (
        <View className="flex-1 justify-center gap-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = dist.find((d) => d.star === star)?.count ?? 0;
            const pct = max > 0 ? (count / max) * 100 : 0;
            return (
              <View key={star} className="flex-row items-center gap-2">
                <Text className="text-[11px] text-ink-secondary w-3">
                  {String(star)}
                </Text>
                <View className="flex-1 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                  <View
                    style={{ width: `${pct}%` }}
                    className="h-full bg-accent-400"
                  />
                </View>
                <Text className="text-[11px] text-ink-muted w-8 text-right">
                  {count.toLocaleString('en-IN')}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
