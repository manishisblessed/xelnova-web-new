import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react-native';
import { type Cart, type CartItem } from '@xelnova/api';
import { Button, FadeIn, Image, Price } from '@xelnova/ui-native';
import { BrandedEmptyState } from '../../src/components/branded-empty-state';
import {
  useCartQuery,
  useRemoveFromCart,
  useUpdateCartItem,
} from '../../src/lib/use-cart';
import { useRequireAuth } from '../../src/lib/require-auth';
import { resolveImageUrl } from '../../src/lib/image-url';
import { formatRupees } from '../../src/lib/format';

export default function CartScreen() {
  const router = useRouter();

  const { data: cart, isLoading } = useCartQuery();
  const updateQty = useUpdateCartItem();
  const removeItem = useRemoveFromCart();

  const items = useMemo<CartItem[]>(() => cart?.items ?? [], [cart]);
  const summary = cart?.summary;

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised items-center justify-center">
        <ActivityIndicator color="#11ab3a" />
      </SafeAreaView>
    );
  }

  if (!cart || items.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <View className="bg-surface border-b border-line-light px-4 py-3">
          <Text className="text-lg font-bold text-ink">Your cart</Text>
        </View>
        <BrandedEmptyState
          Icon={ShoppingBag}
          title="Your cart is empty"
          subtitle="Add a few favourites and they'll appear here ready for checkout."
          primaryLabel="Start shopping"
          primaryHref="/"
          secondaryLabel="Browse the wishlist instead"
          secondaryHref="/wishlist"
          halo={['#dcfce7', '#bbf7d0']}
          accent="#0c831f"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <View className="bg-surface border-b border-line-light px-4 py-3">
        <Text className="text-lg font-bold text-ink">
          Your cart ({summary?.itemCount ?? items.length})
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item, index }) => (
          <FadeIn delay={index * 40} offsetY={8}>
          <View className="bg-surface rounded-2xl border border-line-light flex-row p-3 gap-3"
            style={{
              shadowColor: '#0c831f',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <View className="w-20 h-20 rounded-xl overflow-hidden bg-surface-muted">
              <Image
                uri={resolveImageUrl(item.productImage)}
                className="w-full h-full"
                contentFit="contain"
              />
            </View>
            <View className="flex-1 gap-1">
              {item.brand ? (
                <Text className="text-[10px] uppercase text-ink-muted tracking-wide" numberOfLines={1}>
                  {item.brand}
                </Text>
              ) : null}
              <Text className="text-sm text-ink" numberOfLines={2}>
                {item.productName}
              </Text>
              {item.variant ? (
                <Text className="text-xs text-ink-secondary">{item.variant}</Text>
              ) : null}
              <Price
                amount={item.price}
                compareAt={item.compareAtPrice}
                size="sm"
              />
              <View className="flex-row items-center justify-between mt-1">
                <View className="flex-row items-center bg-surface-muted rounded-full">
                  <Pressable
                    onPress={() =>
                      item.quantity <= 1
                        ? removeItem.mutate(item.productId)
                        : updateQty.mutate({
                            productId: item.productId,
                            quantity: item.quantity - 1,
                          })
                    }
                    className="w-8 h-8 items-center justify-center"
                    hitSlop={6}
                  >
                    <Minus size={14} color="#1a1a2e" />
                  </Pressable>
                  <Text className="text-sm font-semibold text-ink min-w-[24px] text-center">
                    {item.quantity}
                  </Text>
                  <Pressable
                    onPress={() =>
                      updateQty.mutate({
                        productId: item.productId,
                        quantity: item.quantity + 1,
                      })
                    }
                    disabled={item.quantity >= item.stock}
                    className="w-8 h-8 items-center justify-center"
                    hitSlop={6}
                  >
                    <Plus
                      size={14}
                      color={item.quantity >= item.stock ? '#8d95a5' : '#1a1a2e'}
                    />
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => removeItem.mutate(item.productId)}
                  className="w-8 h-8 items-center justify-center"
                  hitSlop={6}
                >
                  <Trash2 size={16} color="#ef4444" />
                </Pressable>
              </View>
            </View>
          </View>
          </FadeIn>
        )}
      />

      {summary ? (
        <CartSummary cart={cart} />
      ) : null}
    </SafeAreaView>
  );
}

function CartSummary({ cart }: { cart: Cart }) {
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const { summary } = cart;

  // The single hard auth gate in the customer flow. Guests pile up a
  // cart freely; sign-in is only required at the moment they commit to
  // ordering. After login the merge-on-login replays guest items into
  // the server cart, so checkout proceeds against the real cart.
  const onCheckout = () =>
    requireAuth('/checkout', () => router.push('/checkout'));

  return (
    <View className="bg-surface border-t border-line-light px-4 py-3 gap-3">
      <View className="gap-1">
        <View className="flex-row justify-between">
          <Text className="text-sm text-ink-secondary">Subtotal</Text>
          <Text className="text-sm text-ink">{formatRupees(summary.subtotal)}</Text>
        </View>
        {summary.discount > 0 ? (
          <View className="flex-row justify-between">
            <Text className="text-sm text-ink-secondary">Discount</Text>
            <Text className="text-sm text-primary-600">
              {`- ${formatRupees(summary.discount)}`}
            </Text>
          </View>
        ) : null}
        <View className="flex-row justify-between">
          <Text className="text-sm text-ink-secondary">Shipping</Text>
          <Text className="text-sm text-ink">
            {summary.shipping > 0 ? formatRupees(summary.shipping) : 'Free'}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-ink-secondary">Tax</Text>
          <Text className="text-sm text-ink">{formatRupees(summary.tax)}</Text>
        </View>
        <View className="flex-row justify-between mt-2">
          <Text className="text-base font-bold text-ink">Total</Text>
          <Text className="text-base font-bold text-ink">
            {formatRupees(summary.total)}
          </Text>
        </View>
      </View>
      <Button fullWidth size="lg" onPress={onCheckout}>
        Proceed to checkout
      </Button>
    </View>
  );
}
