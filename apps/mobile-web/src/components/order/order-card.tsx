import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { Order } from '@xelnova/api';
import { Image } from '@xelnova/ui-native';
import { resolveImageUrl } from '../../lib/image-url';
import { formatRupees } from '../../lib/format';
import { OrderStatusBadge } from './order-status-badge';

interface OrderCardProps {
  order: Order;
  onPress?: () => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  const items = order.items ?? [];
  const previewImages = items
    .slice(0, 4)
    .map((it) => resolveImageUrl(it.productImage ?? it.product?.images?.[0]));
  const moreCount = items.length - previewImages.length;

  return (
    <Pressable
      onPress={onPress}
      className="bg-surface rounded-2xl border border-line-light p-4 active:opacity-90"
    >
      <View className="flex-row items-start justify-between mb-2 gap-3">
        <View className="flex-1">
          <Text className="text-[10px] uppercase tracking-wide text-ink-muted">
            Order
          </Text>
          <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
            {`#${order.orderNumber}`}
          </Text>
          <Text className="text-xs text-ink-muted mt-0.5">
            {`Placed on ${formatDate(order.createdAt)}`}
          </Text>
        </View>
        <OrderStatusBadge status={order.status} />
      </View>

      <View className="flex-row items-center gap-2 mt-1">
        {previewImages.map((uri, idx) => (
          <View
            key={`${order.id}-img-${idx}`}
            className="w-12 h-12 rounded-xl overflow-hidden bg-surface-muted border border-line-light"
          >
            <Image uri={uri} className="w-full h-full" contentFit="contain" />
          </View>
        ))}
        {moreCount > 0 ? (
          <View className="w-12 h-12 rounded-xl bg-surface-muted items-center justify-center border border-line-light">
            <Text className="text-xs font-semibold text-ink-secondary">
              {`+${moreCount}`}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-line-light">
        <View>
          <Text className="text-[10px] uppercase tracking-wide text-ink-muted">
            Total
          </Text>
          <Text className="text-base font-bold text-ink">
            {formatRupees(order.total)}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Text className="text-xs font-semibold text-primary-700">
            View details
          </Text>
          <ChevronRight size={14} color="#0c831f" />
        </View>
      </View>
    </Pressable>
  );
}
