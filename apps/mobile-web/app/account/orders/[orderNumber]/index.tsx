import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  CreditCard,
  FileText,
  MapPin,
  PenSquare,
  RotateCcw,
  XCircle,
} from 'lucide-react-native';
import {
  ordersApi,
  paymentApi,
  reviewsApi,
  type Order,
  type OrderItem,
} from '@xelnova/api';
import { Button, Image, Stars } from '@xelnova/ui-native';
import { ScreenHeader } from '../../../../src/components/screen-header';
import { OrderStatusBadge } from '../../../../src/components/order/order-status-badge';
import { OrderTimeline } from '../../../../src/components/order/order-timeline';
import { ShipmentTracker } from '../../../../src/components/order/shipment-tracker';
import { RazorpayWebView } from '../../../../src/components/checkout/razorpay-webview';
import { queryKeys } from '../../../../src/lib/query-keys';
import { resolveImageUrl } from '../../../../src/lib/image-url';
import { formatRupees } from '../../../../src/lib/format';
import { paymentStatusConfig } from '../../../../src/lib/order-status';
import { returnEligibility } from '../../../../src/lib/returns';
import { useAuth } from '../../../../src/lib/auth-context';
import type {
  RazorpayBridgeMessage,
  RazorpayCheckoutOptions,
} from '../../../../src/lib/razorpay';

const PAYMENT_LABELS: Record<string, string> = {
  razorpay: 'Online (UPI / Card)',
  cod: 'Cash on Delivery',
  wallet: 'Xelnova Wallet',
};

function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return '\u2014';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const REVIEWABLE_STATUSES = new Set(['DELIVERED', 'RETURNED', 'REFUNDED']);

export default function OrderDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();

  const orderQuery = useQuery({
    queryKey: queryKeys.orders.detail(orderNumber as string),
    queryFn: () => ordersApi.getOrderByNumber(orderNumber as string),
    enabled: typeof orderNumber === 'string' && orderNumber.length > 0,
  });

  const order = orderQuery.data;
  const reviewable = order
    ? REVIEWABLE_STATUSES.has((order.status ?? '').toUpperCase())
    : false;

  const reviewStatusQuery = useQuery({
    queryKey: queryKeys.reviews.orderStatus(orderNumber as string),
    queryFn: () => reviewsApi.getOrderReviewStatus(orderNumber as string),
    enabled: !!orderNumber && reviewable,
    retry: false,
  });

  const eligibility = useMemo(
    () => (order ? returnEligibility(order) : null),
    [order],
  );
  const canReturnOrReplace = !!eligibility?.eligible;

  const cancelMutation = useMutation({
    mutationFn: (reason: string) =>
      ordersApi.cancelOrder(orderNumber as string, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.list() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderNumber as string),
      });
      Alert.alert('Order cancelled', 'Your refund will be processed shortly.');
    },
    onError: (e: any) =>
      Alert.alert('Could not cancel', e?.message ?? 'Please try again.'),
  });

  const reviewMutation = useMutation({
    mutationFn: (input: { productId: string; rating: number }) =>
      reviewsApi.createReview({
        productId: input.productId,
        rating: input.rating,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reviews.orderStatus(orderNumber as string),
      });
    },
    onError: (e: any) =>
      Alert.alert('Could not submit rating', e?.message ?? 'Please try again.'),
  });

  const [retryOptions, setRetryOptions] =
    useState<RazorpayCheckoutOptions | null>(null);
  const [retrying, setRetrying] = useState(false);

  const startRetry = async (target: Order) => {
    try {
      setRetrying(true);
      const paymentOrder = await paymentApi.createPaymentOrder(target.id);
      setRetryOptions({
        keyId: paymentOrder.keyId,
        razorpayOrderId: paymentOrder.razorpayOrderId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        orderId: paymentOrder.orderId,
        orderNumber: target.orderNumber,
        prefill: {
          name: user?.name ?? target.shippingAddress?.fullName ?? '',
          email: user?.email ?? '',
          contact: user?.phone ?? target.shippingAddress?.phone ?? '',
        },
      });
    } catch (e: any) {
      Alert.alert('Could not retry', e?.message ?? 'Please try again.');
    } finally {
      setRetrying(false);
    }
  };

  const verifyMutation = useMutation({
    mutationFn: paymentApi.verifyPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderNumber as string),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.list() });
      Alert.alert('Payment received', 'Thanks! Your order is confirmed.');
      setRetryOptions(null);
    },
    onError: (e: any) => {
      Alert.alert('Verification failed', e?.message ?? 'Please contact support.');
      setRetryOptions(null);
    },
  });

  const handleRzpMessage = (msg: RazorpayBridgeMessage) => {
    if (msg.type === 'success') {
      verifyMutation.mutate(msg.payload);
    } else if (msg.type === 'failed') {
      Alert.alert('Payment failed', msg.message);
      setRetryOptions(null);
    } else if (msg.type === 'dismissed') {
      setRetryOptions(null);
    }
  };

  const confirmCancel = () => {
    if (!order) return;
    Alert.alert(
      'Cancel order?',
      'This action cannot be undone. Refunds will be processed automatically.',
      [
        { text: 'Keep order', style: 'cancel' },
        {
          text: 'Cancel order',
          style: 'destructive',
          onPress: () => cancelMutation.mutate('Customer requested cancellation'),
        },
      ],
    );
  };

  if (orderQuery.isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <ScreenHeader title="Order" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#11ab3a" />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <ScreenHeader title="Order" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-semibold text-ink">
            Order not found
          </Text>
          <Button className="mt-4" onPress={() => router.back()}>
            Go back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const cancellable = ['PENDING', 'PROCESSING', 'CONFIRMED'].includes(
    (order.status ?? '').toUpperCase(),
  );
  const showRetryPay =
    (order.paymentMethod ?? '').toLowerCase() === 'razorpay' &&
    ['PENDING', 'FAILED'].includes((order.paymentStatus ?? '').toUpperCase());

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader
        title={`Order #${order.orderNumber}`}
        subtitle={formatDateTime(order.createdAt)}
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
        <View className="flex-row items-center gap-2">
          <OrderStatusBadge status={order.status} size="lg" />
          {order.paymentStatus ? (
            <PaymentBadge status={order.paymentStatus} />
          ) : null}
        </View>

        <OrderTimeline status={order.status} />

        {order.shipment ? <ShipmentTracker shipment={order.shipment} /> : null}

        <View className="bg-surface rounded-2xl border border-line-light p-4 gap-3">
          <Text className="text-sm font-bold text-ink">
            {`${(order.items ?? []).length} ${(order.items ?? []).length === 1 ? 'item' : 'items'}`}
          </Text>
          {(order.items ?? []).map((item) => (
            <OrderLineRow
              key={item.id}
              item={item}
              reviewable={reviewable}
              reviewStatus={reviewStatusQuery.data?.[item.productId]}
              onRate={(rating) =>
                reviewMutation.mutate({ productId: item.productId, rating })
              }
              onWriteReview={() =>
                router.push({
                  pathname: '/account/orders/[orderNumber]/review',
                  params: {
                    orderNumber: order.orderNumber,
                    productId: item.productId,
                  },
                })
              }
            />
          ))}
        </View>

        <View className="bg-surface rounded-2xl border border-line-light p-4 gap-2">
          <Text className="text-sm font-bold text-ink mb-1">Price details</Text>
          <SummaryRow label="Subtotal" value={formatRupees(order.subtotal)} />
          {order.discount > 0 ? (
            <SummaryRow
              label={`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`}
              value={`- ${formatRupees(order.discount)}`}
              valueClassName="text-primary-600"
            />
          ) : null}
          <SummaryRow
            label="Shipping"
            value={order.shipping > 0 ? formatRupees(order.shipping) : 'Free'}
          />
          <SummaryRow label="Tax" value={formatRupees(order.tax)} />
          <View className="border-t border-line-light mt-2 pt-2">
            <SummaryRow label="Total" value={formatRupees(order.total)} bold />
          </View>
        </View>

        {order.shippingAddress ? (
          <View className="bg-surface rounded-2xl border border-line-light p-4 gap-2">
            <View className="flex-row items-center gap-2">
              <MapPin size={14} color="#11ab3a" />
              <Text className="text-sm font-bold text-ink">Delivery address</Text>
            </View>
            <Text className="text-sm text-ink">{order.shippingAddress.fullName}</Text>
            <Text className="text-xs text-ink-secondary leading-relaxed">
              {[
                order.shippingAddress.addressLine1,
                order.shippingAddress.addressLine2,
                order.shippingAddress.landmark,
              ]
                .filter(Boolean)
                .join(', ')}
            </Text>
            <Text className="text-xs text-ink-secondary">
              {`${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`}
            </Text>
            <Text className="text-xs text-ink-muted mt-0.5">
              {order.shippingAddress.phone}
            </Text>
          </View>
        ) : null}

        <View className="bg-surface rounded-2xl border border-line-light p-4 gap-2">
          <View className="flex-row items-center gap-2">
            <CreditCard size={14} color="#11ab3a" />
            <Text className="text-sm font-bold text-ink">Payment</Text>
          </View>
          <Text className="text-sm text-ink">
            {PAYMENT_LABELS[(order.paymentMethod ?? '').toLowerCase()] ??
              order.paymentMethod ??
              'Online'}
          </Text>
          {order.estimatedDelivery ? (
            <View className="flex-row items-center gap-2 mt-1">
              <Calendar size={12} color="#5a6478" />
              <Text className="text-xs text-ink-secondary">
                {`Estimated delivery: ${formatDateTime(order.estimatedDelivery)}`}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="gap-2">
          {showRetryPay ? (
            <Button size="lg" onPress={() => startRetry(order)} loading={retrying}>
              Complete payment
            </Button>
          ) : null}
          <Pressable
            onPress={() =>
              Linking.openURL(ordersApi.getInvoiceUrl(order.orderNumber)).catch(
                () => Alert.alert('Could not open invoice'),
              )
            }
            className="flex-row items-center justify-center gap-2 h-11 rounded-xl border border-line bg-surface active:bg-surface-muted"
          >
            <FileText size={16} color="#1a1a2e" />
            <Text className="text-sm font-semibold text-ink">Download invoice</Text>
          </Pressable>
          {canReturnOrReplace ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/account/orders/[orderNumber]/return',
                  params: { orderNumber: order.orderNumber },
                })
              }
              className="flex-row items-center justify-center gap-2 h-11 rounded-xl border border-line bg-surface active:bg-surface-muted"
            >
              <RotateCcw size={16} color="#1a1a2e" />
              <Text className="text-sm font-semibold text-ink">
                {`Return / replace${
                  eligibility?.daysLeft ? ` \u00b7 ${eligibility.daysLeft}d left` : ''
                }`}
              </Text>
            </Pressable>
          ) : null}
          {cancellable ? (
            <Pressable
              onPress={confirmCancel}
              className="flex-row items-center justify-center gap-2 h-11 rounded-xl bg-danger-50 active:bg-danger-100"
            >
              <XCircle size={16} color="#b91c1c" />
              <Text className="text-sm font-semibold text-danger-700">
                Cancel order
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <RazorpayWebView
        visible={!!retryOptions}
        options={retryOptions}
        onMessage={handleRzpMessage}
        onRequestClose={() => setRetryOptions(null)}
      />
    </SafeAreaView>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const cfg = paymentStatusConfig(status);
  return (
    <View
      style={{ backgroundColor: cfg.background }}
      className="flex-row items-center self-start gap-1.5 rounded-full px-2 py-1"
    >
      <Text style={{ color: cfg.color }} className="text-xs font-semibold">
        {cfg.label}
      </Text>
    </View>
  );
}

function OrderLineRow({
  item,
  reviewable,
  reviewStatus,
  onRate,
  onWriteReview,
}: {
  item: OrderItem;
  reviewable: boolean;
  reviewStatus?: { reviewed: true; rating: number; status: string } | undefined;
  onRate: (rating: number) => void;
  onWriteReview: () => void;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row gap-3 items-center">
        <View className="w-14 h-14 rounded-xl overflow-hidden bg-surface-muted border border-line-light">
          <Image
            uri={resolveImageUrl(item.productImage ?? item.product?.images?.[0])}
            className="w-full h-full"
            contentFit="contain"
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm text-ink" numberOfLines={2}>
            {item.productName}
          </Text>
          {item.variant ? (
            <Text className="text-xs text-ink-muted mt-0.5">{item.variant}</Text>
          ) : null}
          <Text className="text-xs text-ink-secondary mt-1">
            {`Qty ${item.quantity} \u00b7 ${formatRupees(item.price * item.quantity)}`}
          </Text>
        </View>
      </View>
      {reviewable ? (
        <View className="bg-surface-muted/60 rounded-xl px-3 py-2 flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="text-[11px] uppercase tracking-wide text-ink-muted font-semibold">
              {reviewStatus ? 'Your rating' : 'Rate this product'}
            </Text>
            <Stars
              value={reviewStatus?.rating ?? 0}
              onChange={
                reviewStatus
                  ? undefined
                  : (rating) => onRate(rating)
              }
              size={18}
            />
          </View>
          <Pressable
            onPress={onWriteReview}
            className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-full active:opacity-60"
            hitSlop={4}
          >
            <PenSquare size={14} color="#0c831f" />
            <Text className="text-xs font-semibold text-primary-700">
              {reviewStatus ? 'Update' : 'Write review'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  valueClassName,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueClassName?: string;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text
        className={
          bold ? 'text-base font-bold text-ink' : 'text-sm text-ink-secondary'
        }
      >
        {label}
      </Text>
      <Text
        className={`${
          bold ? 'text-base font-bold text-ink' : 'text-sm text-ink'
        } ${valueClassName ?? ''}`}
      >
        {value}
      </Text>
    </View>
  );
}
