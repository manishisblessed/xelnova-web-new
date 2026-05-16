import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, CreditCard } from 'lucide-react-native';
import {
  cartApi,
  ordersApi,
  paymentApi,
  type Cart,
  type CartItem,
  type Order,
} from '@xelnova/api';
import {
  Button,
  Image,
  RadioCard,
} from '@xelnova/ui-native';
import { ScreenHeader } from '../../src/components/screen-header';
import { StepIndicator } from '../../src/components/checkout/step-indicator';
import { CouponInput } from '../../src/components/checkout/coupon-input';
import { RazorpayWebView } from '../../src/components/checkout/razorpay-webview';
import { queryKeys } from '../../src/lib/query-keys';
import { resolveImageUrl } from '../../src/lib/image-url';
import { formatRupees } from '../../src/lib/format';
import { useCheckout } from '../../src/lib/checkout-context';
import { useAuth } from '../../src/lib/auth-context';
import type {
  RazorpayBridgeMessage,
  RazorpayCheckoutOptions,
} from '../../src/lib/razorpay';

export default function CheckoutReviewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedAddress, paymentMethod, setPaymentMethod, setCouponCode } =
    useCheckout();

  const cartQuery = useQuery({
    queryKey: queryKeys.cart(),
    queryFn: () => cartApi.getCart(),
    retry: false,
  });

  const shippingConfigQuery = useQuery({
    queryKey: queryKeys.shippingConfig(),
    queryFn: () => cartApi.getShippingConfig(),
    staleTime: 60 * 60_000,
  });

  const cart = cartQuery.data;
  const shippingConfig = shippingConfigQuery.data;

  const [placing, setPlacing] = useState(false);
  const [rzpOptions, setRzpOptions] =
    useState<RazorpayCheckoutOptions | null>(null);
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);

  const verifyMutation = useMutation({
    mutationFn: paymentApi.verifyPayment,
    onSuccess: () => {
      if (!pendingOrder) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.list() });
      router.replace({
        pathname: '/checkout/success',
        params: { orderNumber: pendingOrder.orderNumber },
      });
      setRzpOptions(null);
      setPendingOrder(null);
    },
    onError: (e: any) => {
      Alert.alert(
        'Payment verification failed',
        e?.message ??
          'We could not verify your payment. If money was debited, it will be refunded automatically.',
      );
      setRzpOptions(null);
      setPendingOrder(null);
    },
  });

  const handleRzpMessage = (msg: RazorpayBridgeMessage) => {
    if (msg.type === 'success') {
      verifyMutation.mutate(msg.payload);
    } else if (msg.type === 'failed') {
      Alert.alert('Payment failed', msg.message);
      setRzpOptions(null);
    } else if (msg.type === 'dismissed') {
      Alert.alert(
        'Payment cancelled',
        'You can retry the payment anytime from your orders.',
      );
      setRzpOptions(null);
    }
  };

  const placeOrder = async () => {
    if (!cart || cart.items.length === 0) {
      Alert.alert('Cart empty', 'Add items to your cart to continue.');
      return;
    }
    if (!selectedAddress) {
      Alert.alert('Pick an address', 'Go back and choose a delivery address.');
      return;
    }

    setPlacing(true);
    try {
      const order = await ordersApi.createOrder({
        items: cart.items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          variant: it.variant ?? undefined,
        })),
        shippingAddress: {
          fullName: selectedAddress.fullName,
          phone: selectedAddress.phone,
          addressLine1: selectedAddress.addressLine1,
          addressLine2: selectedAddress.addressLine2 ?? undefined,
          city: selectedAddress.city,
          state: selectedAddress.state,
          pincode: selectedAddress.pincode,
          landmark: selectedAddress.landmark ?? undefined,
          type: selectedAddress.type,
        },
        paymentMethod,
        couponCode: cart.coupon?.code,
        customerName: user?.name ?? selectedAddress.fullName,
        customerEmail: user?.email ?? undefined,
      });

      if (paymentMethod === 'cod') {
        queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.list() });
        router.replace({
          pathname: '/checkout/success',
          params: { orderNumber: order.orderNumber },
        });
        return;
      }

      // Razorpay path
      const paymentOrder = await paymentApi.createPaymentOrder(order.id);
      setPendingOrder(order);
      setRzpOptions({
        keyId: paymentOrder.keyId,
        razorpayOrderId: paymentOrder.razorpayOrderId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        orderId: paymentOrder.orderId,
        orderNumber: order.orderNumber,
        prefill: {
          name: user?.name ?? selectedAddress.fullName,
          email: user?.email ?? '',
          contact: user?.phone ?? selectedAddress.phone,
        },
      });
    } catch (e: any) {
      Alert.alert('Could not place order', e?.message ?? 'Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (cartQuery.isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <ScreenHeader title="Review order" />
        <StepIndicator active={2} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#11ab3a" />
        </View>
      </SafeAreaView>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <ScreenHeader title="Review order" />
        <StepIndicator active={2} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-semibold text-ink">
            Your cart is empty
          </Text>
          <Button className="mt-4" onPress={() => router.replace('/(tabs)/cart')}>
            Back to cart
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const codEnabled = shippingConfig?.codEnabled !== false;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <ScreenHeader title="Review order" />
      <StepIndicator active={2} />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 140 }}>
        {selectedAddress ? (
          <View className="bg-surface rounded-2xl border border-line-light p-4">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold">
                Deliver to
              </Text>
              <Text
                onPress={() => router.back()}
                className="text-xs font-semibold text-primary-700"
              >
                Change
              </Text>
            </View>
            <Text className="text-sm font-semibold text-ink">
              {selectedAddress.fullName}
            </Text>
            <Text className="text-xs text-ink-secondary mt-0.5 leading-relaxed">
              {[
                selectedAddress.addressLine1,
                selectedAddress.addressLine2,
                selectedAddress.landmark,
              ]
                .filter(Boolean)
                .join(', ')}
            </Text>
            <Text className="text-xs text-ink-secondary">
              {`${selectedAddress.city}, ${selectedAddress.state} - ${selectedAddress.pincode}`}
            </Text>
          </View>
        ) : null}

        <View className="gap-3">
          <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold px-1">
            Payment method
          </Text>
          <RadioCard
            selected={paymentMethod === 'razorpay'}
            onPress={() => setPaymentMethod('razorpay')}
            leading={
              <View className="w-9 h-9 rounded-xl bg-promo-mint-50 items-center justify-center">
                <CreditCard size={16} color="#11ab3a" />
              </View>
            }
            title="UPI / Card / Net banking"
            description="Pay securely via Razorpay. Cards, UPI, wallets, and EMI supported."
          />
          <RadioCard
            selected={paymentMethod === 'cod'}
            onPress={() => setPaymentMethod('cod')}
            disabled={!codEnabled}
            leading={
              <View className="w-9 h-9 rounded-xl bg-accent-50 items-center justify-center">
                <Banknote size={16} color="#b07a00" />
              </View>
            }
            title="Cash on Delivery"
            description={
              codEnabled
                ? 'Pay in cash when your order arrives'
                : 'COD is currently unavailable'
            }
          />
        </View>

        <View>
          <Text className="text-xs uppercase tracking-wide text-ink-muted font-semibold px-1 mb-2">
            Coupon
          </Text>
          <CouponInput
            appliedCode={cart.coupon?.code}
            appliedDiscount={cart.coupon?.discount}
            onApplied={(code) => setCouponCode(code)}
          />
        </View>

        <View className="bg-surface rounded-2xl border border-line-light p-4 gap-3">
          <Text className="text-sm font-bold text-ink">
            {`${cart.items.length} ${cart.items.length === 1 ? 'item' : 'items'} in your bag`}
          </Text>
          {cart.items.map((it) => (
            <ReviewLineRow key={it.id} item={it} />
          ))}
        </View>

        <CheckoutSummary cart={cart} />
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-surface border-t border-line-light px-4 pt-3 pb-6">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs text-ink-muted">Total payable</Text>
          <Text className="text-base font-bold text-ink">
            {formatRupees(cart.summary.total)}
          </Text>
        </View>
        <Button fullWidth size="lg" onPress={placeOrder} loading={placing}>
          {paymentMethod === 'cod' ? 'Place order' : 'Pay now'}
        </Button>
      </View>

      <RazorpayWebView
        visible={!!rzpOptions}
        options={rzpOptions}
        onMessage={handleRzpMessage}
        onRequestClose={() => setRzpOptions(null)}
      />
    </SafeAreaView>
  );
}

function ReviewLineRow({ item }: { item: CartItem }) {
  return (
    <View className="flex-row gap-3">
      <View className="w-14 h-14 rounded-xl overflow-hidden bg-surface-muted border border-line-light">
        <Image
          uri={resolveImageUrl(item.productImage)}
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
  );
}

function CheckoutSummary({ cart }: { cart: Cart }) {
  const { summary } = cart;
  return (
    <View className="bg-surface rounded-2xl border border-line-light p-4 gap-2">
      <Text className="text-sm font-bold text-ink mb-1">Price details</Text>
      <Row label="Subtotal" value={formatRupees(summary.subtotal)} />
      {summary.discount > 0 ? (
        <Row
          label="Discount"
          value={`- ${formatRupees(summary.discount)}`}
          valueClassName="text-primary-600"
        />
      ) : null}
      <Row
        label="Shipping"
        value={summary.shipping > 0 ? formatRupees(summary.shipping) : 'Free'}
      />
      <Row label="Tax" value={formatRupees(summary.tax)} />
      <View className="h-px bg-line-light my-1" />
      <Row label="Total" value={formatRupees(summary.total)} bold />
    </View>
  );
}

function Row({
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
