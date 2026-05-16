import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi, reviewsApi } from '@xelnova/api';
import { Button, Image, Stars } from '@xelnova/ui-native';
import { ScreenHeader } from '../../../../src/components/screen-header';
import { queryKeys } from '../../../../src/lib/query-keys';
import { resolveImageUrl } from '../../../../src/lib/image-url';

const RATING_LABELS: Record<number, string> = {
  1: 'Bad',
  2: 'Poor',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

export default function WriteReviewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orderNumber, productId } = useLocalSearchParams<{
    orderNumber: string;
    productId: string;
  }>();

  const orderQuery = useQuery({
    queryKey: queryKeys.orders.detail(orderNumber as string),
    queryFn: () => ordersApi.getOrderByNumber(orderNumber as string),
    enabled: typeof orderNumber === 'string' && orderNumber.length > 0,
  });
  const order = orderQuery.data;

  const item = useMemo(
    () => order?.items.find((it) => it.productId === productId) ?? null,
    [order, productId],
  );

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');

  const submitMutation = useMutation({
    mutationFn: () =>
      reviewsApi.createReview({
        productId: productId as string,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reviews.orderStatus(orderNumber as string),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.reviews.product(productId as string),
      });
      Alert.alert(
        'Review submitted',
        'Thanks for your feedback. It will appear once approved.',
        [{ text: 'Done', onPress: () => router.back() }],
      );
    },
    onError: (e: any) =>
      Alert.alert('Could not submit', e?.message ?? 'Please try again.'),
  });

  if (orderQuery.isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <ScreenHeader title="Write a review" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#11ab3a" />
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <ScreenHeader title="Write a review" />
        <View className="flex-1 items-center justify-center px-6 gap-3">
          <Text className="text-base font-semibold text-ink">
            Product not found
          </Text>
          <Button onPress={() => router.back()}>Go back</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader title="Write a review" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
          <View className="bg-surface rounded-2xl border border-line-light p-4 flex-row items-center gap-3">
            <View className="w-16 h-16 rounded-xl overflow-hidden bg-surface-muted">
              <Image
                uri={resolveImageUrl(
                  item.productImage ?? item.product?.images?.[0],
                )}
                className="w-full h-full"
                contentFit="contain"
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-ink" numberOfLines={2}>
                {item.productName}
              </Text>
              {item.variant ? (
                <Text className="text-xs text-ink-muted mt-0.5">
                  {item.variant}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="bg-surface rounded-2xl border border-line-light p-4 items-center gap-3">
            <Text className="text-sm font-semibold text-ink">
              How would you rate this product?
            </Text>
            <Stars value={rating} onChange={setRating} size={36} />
            <Text className="text-xs text-ink-secondary">
              {rating > 0 ? RATING_LABELS[rating] : 'Tap a star to rate'}
            </Text>
          </View>

          <View className="gap-2">
            <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
              Title (optional)
            </Text>
            <View className="bg-surface border border-line rounded-2xl px-3.5">
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Sum it up in a line"
                placeholderTextColor="#8d95a5"
                className="h-12 text-sm text-ink"
                maxLength={120}
              />
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
              Review (optional)
            </Text>
            <View className="bg-surface border border-line rounded-2xl px-3 py-2">
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Tell others what you liked or didn't"
                placeholderTextColor="#8d95a5"
                multiline
                textAlignVertical="top"
                className="min-h-32 text-sm text-ink"
                maxLength={1000}
              />
            </View>
            <Text className="text-[11px] text-ink-muted text-right">
              {`${comment.length}/1000`}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View className="bg-surface border-t border-line-light px-4 pt-3 pb-6">
        <Button
          fullWidth
          size="lg"
          disabled={rating < 1}
          onPress={() => submitMutation.mutate()}
          loading={submitMutation.isPending}
        >
          Submit review
        </Button>
      </View>
    </SafeAreaView>
  );
}
