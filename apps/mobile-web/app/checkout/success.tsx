import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Package, Truck } from 'lucide-react-native';
import { ordersApi } from '@xelnova/api';
import { Button, Card, Image } from '@xelnova/ui-native';
import { queryKeys } from '../../src/lib/query-keys';
import { resolveImageUrl } from '../../src/lib/image-url';
import { formatRupees } from '../../src/lib/format';
import { paymentStatusConfig } from '../../src/lib/order-status';

function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return 'Today';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function CheckoutSuccessScreen() {
  const router = useRouter();
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();

  const orderQuery = useQuery({
    queryKey: queryKeys.orders.detail(orderNumber as string),
    queryFn: () => ordersApi.getOrderByNumber(orderNumber as string),
    enabled: typeof orderNumber === 'string' && orderNumber.length > 0,
    refetchOnMount: 'always',
  });

  const order = orderQuery.data;

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-surface-raised">
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 32, gap: 16 }}>
        <View className="items-center gap-3 py-4">
          <View className="w-20 h-20 rounded-full bg-promo-mint-50 items-center justify-center">
            <CheckCircle2 size={48} color="#11ab3a" />
          </View>
          <Text className="text-2xl font-bold text-ink text-center">
            Order placed!
          </Text>
          <Text className="text-sm text-ink-secondary text-center">
            Thanks for shopping with Xelnova. We will email you a confirmation
            shortly.
          </Text>
        </View>

        {orderQuery.isLoading ? (
          <View className="items-center py-6">
            <ActivityIndicator color="#11ab3a" />
          </View>
        ) : order ? (
          <>
            <Card variant="flat" className="gap-3">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-[10px] uppercase text-ink-muted tracking-wide">
                    Order number
                  </Text>
                  <Text className="text-base font-bold text-ink">
                    {`#${order.orderNumber}`}
                  </Text>
                </View>
                <View>
                  <Text className="text-[10px] uppercase text-ink-muted tracking-wide text-right">
                    Total paid
                  </Text>
                  <Text className="text-base font-bold text-ink">
                    {formatRupees(order.total)}
                  </Text>
                </View>
              </View>
              {order.paymentStatus ? (
                <View
                  style={{
                    backgroundColor: paymentStatusConfig(order.paymentStatus)
                      .background,
                  }}
                  className="self-start rounded-full px-2 py-1"
                >
                  <Text
                    style={{
                      color: paymentStatusConfig(order.paymentStatus).color,
                    }}
                    className="text-xs font-semibold"
                  >
                    {paymentStatusConfig(order.paymentStatus).label}
                  </Text>
                </View>
              ) : null}
            </Card>

            <Card variant="flat" className="gap-3">
              <View className="flex-row items-center gap-2">
                <Truck size={16} color="#11ab3a" />
                <Text className="text-sm font-bold text-ink">
                  Estimated delivery
                </Text>
              </View>
              <Text className="text-sm text-ink-secondary">
                {order.estimatedDelivery
                  ? formatDateTime(order.estimatedDelivery)
                  : 'We will share an estimate as soon as the seller dispatches your order.'}
              </Text>
            </Card>

            <Card variant="flat" className="gap-3">
              <View className="flex-row items-center gap-2">
                <Package size={16} color="#11ab3a" />
                <Text className="text-sm font-bold text-ink">
                  {`${order.items.length} ${order.items.length === 1 ? 'item' : 'items'}`}
                </Text>
              </View>
              {order.items.slice(0, 3).map((item) => (
                <View key={item.id} className="flex-row items-center gap-3">
                  <View className="w-12 h-12 rounded-xl overflow-hidden bg-surface-muted">
                    <Image
                      uri={resolveImageUrl(
                        item.productImage ?? item.product?.images?.[0],
                      )}
                      className="w-full h-full"
                      contentFit="contain"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-ink" numberOfLines={2}>
                      {item.productName}
                    </Text>
                    <Text className="text-xs text-ink-secondary mt-0.5">
                      {`Qty ${item.quantity}`}
                    </Text>
                  </View>
                </View>
              ))}
              {order.items.length > 3 ? (
                <Text className="text-xs text-ink-muted">
                  {`+ ${order.items.length - 3} more`}
                </Text>
              ) : null}
            </Card>
          </>
        ) : null}

        <View className="gap-2 mt-4">
          <Button
            fullWidth
            size="lg"
            onPress={() =>
              router.replace({
                pathname: '/account/orders/[orderNumber]',
                params: { orderNumber: orderNumber as string },
              })
            }
          >
            View order details
          </Button>
          <Button
            fullWidth
            variant="outline"
            size="lg"
            onPress={() => router.replace('/(tabs)')}
          >
            Continue shopping
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
