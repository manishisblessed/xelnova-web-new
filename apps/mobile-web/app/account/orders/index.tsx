import { ActivityIndicator, FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react-native';
import { ordersApi } from '@xelnova/api';
import { Button, EmptyState } from '@xelnova/ui-native';
import { ScreenHeader } from '../../../src/components/screen-header';
import { OrderCard } from '../../../src/components/order/order-card';
import { queryKeys } from '../../../src/lib/query-keys';

export default function OrdersScreen() {
  const router = useRouter();

  const { data: orders, isLoading } = useQuery({
    queryKey: queryKeys.orders.list(),
    queryFn: () => ordersApi.getOrders(),
    retry: false,
  });

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <ScreenHeader title="My orders" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#11ab3a" />
        </View>
      </SafeAreaView>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <ScreenHeader title="My orders" />
        <View className="flex-1 items-center justify-center px-6">
          <EmptyState
            icon={<Package size={40} color="#11ab3a" />}
            title="No orders yet"
            subtitle="When you place an order, it will appear here."
            action={
              <Button onPress={() => router.push('/(tabs)')}>
                Start shopping
              </Button>
            }
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader
        title="My orders"
        subtitle={`${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`}
      />
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() =>
              router.push({
                pathname: '/account/orders/[orderNumber]',
                params: { orderNumber: item.orderNumber },
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}
