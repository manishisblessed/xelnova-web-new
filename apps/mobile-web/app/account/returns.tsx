import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, RotateCcw } from 'lucide-react-native';
import { returnsApi } from '@xelnova/api';

type ReturnRequest = Awaited<ReturnType<typeof returnsApi.getReturns>>[number];
import { EmptyState, Image, Pill } from '@xelnova/ui-native';
import { ScreenHeader } from '../../src/components/screen-header';
import { queryKeys } from '../../src/lib/query-keys';
import { resolveImageUrl } from '../../src/lib/image-url';
import { formatRupees } from '../../src/lib/format';

const STATUS_TONE: Record<
  ReturnRequest['status'],
  { label: string; tone: 'primary' | 'accent' | 'success' | 'neutral' | 'danger' }
> = {
  REQUESTED: { label: 'Requested', tone: 'primary' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  PICKED_UP: { label: 'Picked up', tone: 'accent' },
  REFUNDED: { label: 'Refunded', tone: 'neutral' },
};

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

export default function ReturnsScreen() {
  const router = useRouter();

  const returnsQuery = useQuery({
    queryKey: queryKeys.returns.list(),
    queryFn: () => returnsApi.getReturns(),
    retry: false,
  });

  if (returnsQuery.isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <ScreenHeader title="Returns & refunds" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#11ab3a" />
        </View>
      </SafeAreaView>
    );
  }

  const list = returnsQuery.data ?? [];

  if (list.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <ScreenHeader title="Returns & refunds" />
        <View className="flex-1 items-center justify-center px-6">
          <EmptyState
            icon={<RotateCcw size={40} color="#11ab3a" />}
            title="No return requests"
            subtitle="When you raise a return, it will appear here."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader
        title="Returns & refunds"
        subtitle={`${list.length} ${list.length === 1 ? 'request' : 'requests'}`}
      />
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        renderItem={({ item }) => {
          const tone = STATUS_TONE[item.status] ?? {
            label: item.status,
            tone: 'neutral' as const,
          };
          const firstItem = item.order.items?.[0];
          return (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/account/orders/[orderNumber]',
                  params: { orderNumber: item.order.orderNumber },
                })
              }
              className="bg-surface rounded-2xl border border-line-light p-4 active:opacity-90"
            >
              <View className="flex-row items-start justify-between gap-3 mb-2">
                <View className="flex-1">
                  <Text className="text-[10px] uppercase tracking-wide text-ink-muted">
                    {item.kind === 'REPLACEMENT' ? 'Replacement' : 'Return'}
                  </Text>
                  <Text className="text-sm font-semibold text-ink">
                    {`#${item.order.orderNumber}`}
                  </Text>
                  <Text className="text-[11px] text-ink-muted mt-0.5">
                    {`Raised on ${formatDate(item.createdAt)}`}
                  </Text>
                </View>
                <Pill tone={tone.tone} size="sm">
                  {tone.label}
                </Pill>
              </View>

              {firstItem ? (
                <View className="flex-row items-center gap-3">
                  <View className="w-12 h-12 rounded-xl overflow-hidden bg-surface-muted border border-line-light">
                    <Image
                      uri={resolveImageUrl(
                        firstItem.productImage ??
                          firstItem.product?.images?.[0] ??
                          null,
                      )}
                      className="w-full h-full"
                      contentFit="contain"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-ink" numberOfLines={1}>
                      {firstItem.productName}
                    </Text>
                    <Text className="text-xs text-ink-secondary mt-0.5">
                      {item.reason}
                    </Text>
                  </View>
                </View>
              ) : null}

              <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-line-light">
                <View>
                  <Text className="text-[10px] uppercase tracking-wide text-ink-muted">
                    Refund
                  </Text>
                  <Text className="text-sm font-bold text-ink">
                    {item.refundAmount != null
                      ? formatRupees(item.refundAmount)
                      : '\u2014'}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Text className="text-xs font-semibold text-primary-700">
                    View order
                  </Text>
                  <ChevronRight size={14} color="#0c831f" />
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
