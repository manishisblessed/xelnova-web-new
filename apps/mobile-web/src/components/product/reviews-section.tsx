import { Alert, Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ThumbsUp } from 'lucide-react-native';
import { reviewsApi, type Review, type ReviewSummary } from '@xelnova/api';
import { Avatar, Image, RatingSummary, Stars } from '@xelnova/ui-native';
import { queryKeys } from '../../lib/query-keys';
import { resolveImageUrl } from '../../lib/image-url';

interface ReviewsSectionProps {
  productId: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

interface ReviewsResponse {
  reviews: Review[];
  summary: ReviewSummary | null;
}

export function ReviewsSection({ productId }: ReviewsSectionProps) {
  const queryClient = useQueryClient();

  const reviewsQuery = useQuery<ReviewsResponse>({
    queryKey: queryKeys.reviews.product(productId),
    queryFn: async () => {
      const res = await reviewsApi.getProductReviews(productId, 1, 8);
      return {
        reviews: res.reviews ?? [],
        summary: res.summary ?? null,
      };
    },
  });

  const helpfulMutation = useMutation({
    mutationFn: (reviewId: string) => reviewsApi.markReviewHelpful(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reviews.product(productId),
      });
    },
    onError: (e: any) =>
      Alert.alert('Could not mark helpful', e?.message ?? 'Try again later.'),
  });

  const summary = reviewsQuery.data?.summary;
  const list = reviewsQuery.data?.reviews ?? [];

  if (!summary && list.length === 0) {
    return null;
  }

  return (
    <View className="gap-3">
      {summary && summary.totalReviews > 0 ? (
        <RatingSummary
          avgRating={summary.avgRating}
          totalReviews={summary.totalReviews}
          distribution={summary.ratingDistribution}
        />
      ) : null}

      {list.length === 0 ? (
        <Text className="text-sm text-ink-secondary">
          No customer reviews yet.
        </Text>
      ) : (
        <View className="gap-3">
          {list.map((review) => (
            <View
              key={review.id}
              className="bg-surface rounded-2xl border border-line-light p-4 gap-2"
            >
              <View className="flex-row items-center gap-3">
                <Avatar
                  name={review.user?.name ?? 'X'}
                  uri={review.user?.avatar}
                  size="sm"
                />
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 flex-wrap">
                    <Text
                      className="text-sm font-semibold text-ink"
                      numberOfLines={1}
                    >
                      {review.user?.name ?? 'Anonymous'}
                    </Text>
                    {review.verified ? (
                      <View className="bg-promo-mint-50 rounded-full px-1.5 py-0.5">
                        <Text className="text-[10px] font-semibold text-primary-700">
                          Verified
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    <Stars value={review.rating} size={12} />
                    <Text className="text-[11px] text-ink-muted">
                      {formatDate(review.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>

              {review.title ? (
                <Text className="text-sm font-semibold text-ink">
                  {review.title}
                </Text>
              ) : null}
              {review.comment ? (
                <Text className="text-sm text-ink-secondary leading-relaxed">
                  {review.comment}
                </Text>
              ) : null}

              {review.images && review.images.length > 0 ? (
                <View className="flex-row flex-wrap gap-2 mt-1">
                  {review.images.slice(0, 4).map((img, idx) => (
                    <View
                      key={`${review.id}-img-${idx}`}
                      className="w-16 h-16 rounded-lg overflow-hidden bg-surface-muted"
                    >
                      <Image
                        uri={resolveImageUrl(img)}
                        className="w-full h-full"
                        contentFit="cover"
                      />
                    </View>
                  ))}
                </View>
              ) : null}

              <Pressable
                onPress={() => helpfulMutation.mutate(review.id)}
                hitSlop={4}
                className="flex-row items-center gap-1.5 self-start mt-1 active:opacity-60"
              >
                <ThumbsUp size={14} color="#5a6478" />
                <Text className="text-xs text-ink-secondary">
                  {`Helpful${review.helpful > 0 ? ` (${review.helpful})` : ''}`}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
