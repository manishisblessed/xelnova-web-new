import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Share2,
  ShoppingBag,
  Store,
  Truck,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { productsApi, type Product } from '@xelnova/api';
import {
  AnimatedHeart,
  Button,
  FadeIn,
  Pill,
  Price,
  RatingPill,
  SectionHeader,
  TagChip,
} from '@xelnova/ui-native';
import { ImageGallery } from '../../src/components/product/image-gallery';
import { ProductRail } from '../../src/components/product-rail';
import { ReviewsSection } from '../../src/components/product/reviews-section';
import { queryKeys } from '../../src/lib/query-keys';
import { pickPrimaryImage, resolveImageUrl } from '../../src/lib/image-url';
import { recordRecentProduct } from '../../src/lib/local-history';
import { shareProduct } from '../../src/lib/share';
import { useAddToCart } from '../../src/lib/use-cart';
import { useRequireAuth } from '../../src/lib/require-auth';
import { useToggleWishlist, useWishlistIds } from '../../src/lib/use-wishlist';

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const requireAuth = useRequireAuth();

  const productQuery = useQuery({
    queryKey: queryKeys.products.detail(slug as string),
    queryFn: () => productsApi.getProductBySlug(slug as string),
    enabled: typeof slug === 'string' && slug.length > 0,
    staleTime: 5 * 60_000,
  });

  const wishlistIds = useWishlistIds();
  const toggleWishlist = useToggleWishlist();
  const addToCart = useAddToCart();

  const isWishlisted = useMemo(
    () =>
      productQuery.data
        ? (wishlistIds.data ?? []).includes(productQuery.data.id)
        : false,
    [wishlistIds.data, productQuery.data],
  );

  const [adding, setAdding] = useState<'cart' | 'buy' | null>(null);

  const product = productQuery.data;
  const images = useMemo(
    () => (product?.images ?? []).map((u) => resolveImageUrl(u)),
    [product],
  );

  useEffect(() => {
    if (!product) return;
    recordRecentProduct({
      id: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: pickPrimaryImage(product.images),
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? null,
      brand: product.brand ?? null,
      rating: product.rating,
      reviewCount: product.reviewCount,
    });
  }, [product]);

  if (productQuery.isLoading) {
    return (
      <View className="flex-1 bg-surface-raised items-center justify-center">
        <ActivityIndicator color="#11ab3a" />
      </View>
    );
  }

  if (!product) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-ink">
            Product not found
          </Text>
          <Text className="text-sm text-ink-secondary text-center mt-1">
            It may have been removed or the link is broken.
          </Text>
          <Button className="mt-4" onPress={() => router.back()}>
            Go back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const buildCartInput = () => ({
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    productImage: pickPrimaryImage(product.images) ?? '',
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? null,
    brand: product.brand ?? null,
    sellerId: product.sellerId,
    stock: product.stock,
    variant: null,
    quantity: 1,
  });

  const onAdd = () => {
    setAdding('cart');
    addToCart.mutate(buildCartInput(), {
      onSettled: () => setAdding(null),
    });
  };

  // "Buy now" is the express checkout path: add-to-cart, then jump
  // straight into checkout. Both legs are auth-gated — guests pile the
  // item into the local cart, then bounce through `/(auth)/login?next=/checkout`
  // and land on checkout with the merged cart.
  const onBuyNow = () => {
    setAdding('buy');
    addToCart.mutate(buildCartInput(), {
      onSettled: () => setAdding(null),
      onSuccess: () => {
        requireAuth('/checkout', () => router.push('/checkout'));
      },
    });
  };

  const inStock = product.stock > 0;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="absolute top-0 left-0 right-0 z-10 flex-row items-center justify-between px-3 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full bg-surface/90"
          hitSlop={6}
        >
          <ArrowLeft size={22} color="#1a1a2e" />
        </Pressable>
        <View className="flex-row gap-2">
          <View className="w-10 h-10 items-center justify-center rounded-full bg-surface/90">
            <AnimatedHeart
              active={isWishlisted}
              onToggle={() => toggleWishlist.mutate({ product })}
              size={20}
              activeColor="#ef4444"
              inactiveColor="#1a1a2e"
            />
          </View>
          <Pressable
            onPress={() =>
              shareProduct({
                name: product.name,
                slug: product.slug,
                price: product.price,
                brand: product.brand,
              })
            }
            className="w-10 h-10 items-center justify-center rounded-full bg-surface/90"
            hitSlop={6}
          >
            <Share2 size={20} color="#1a1a2e" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <ImageGallery images={images} />

        <View className="bg-surface px-4 pt-4 pb-6 gap-3">
          <View className="flex-row items-center gap-2 flex-wrap">
            {product.brand ? (
              <Text className="text-[11px] uppercase tracking-wide text-ink-muted font-semibold">
                {product.brand}
              </Text>
            ) : null}
            {product.isFlashDeal ? (
              <Pill tone="danger" size="sm">
                Flash Deal
              </Pill>
            ) : null}
            {product.isFeatured ? (
              <Pill tone="primary" size="sm">
                Featured
              </Pill>
            ) : null}
          </View>
          <Text className="text-xl font-bold text-ink leading-tight">
            {product.name}
          </Text>
          {product.shortDescription ? (
            <Text className="text-sm text-ink-secondary leading-relaxed">
              {product.shortDescription}
            </Text>
          ) : null}
          <View className="flex-row items-center gap-3">
            <RatingPill
              rating={product.rating}
              reviewCount={product.reviewCount}
              variant="full"
            />
            {!inStock ? (
              <Pill tone="danger" size="sm">
                Out of stock
              </Pill>
            ) : product.stock < 10 ? (
              <Pill tone="accent" size="sm">
                Only {product.stock} left
              </Pill>
            ) : null}
          </View>
          <Price
            amount={product.price}
            compareAt={product.compareAtPrice}
            size="lg"
          />
          <Text className="text-[11px] text-ink-muted">
            Inclusive of all taxes
          </Text>
        </View>

        <FadeIn delay={120}>
        {product.seller ? (
          <Pressable
            onPress={() =>
              product.seller?.slug
                ? router.push({
                    pathname: '/stores/[slug]',
                    params: { slug: product.seller.slug },
                  })
                : undefined
            }
            className="mx-4 mt-3 bg-surface rounded-2xl border border-line-light p-4 flex-row items-center gap-3 active:opacity-80"
          >
            <View className="w-12 h-12 rounded-full bg-promo-mint-50 items-center justify-center">
              <Store size={20} color="#11ab3a" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] uppercase text-ink-muted tracking-wide">
                Sold by
              </Text>
              <Text className="text-sm font-semibold text-ink">
                {product.seller.storeName}
              </Text>
              {product.seller.rating ? (
                <Text className="text-xs text-ink-secondary mt-0.5">
                  {`${product.seller.rating.toFixed(1)} \u2605 store rating`}
                </Text>
              ) : null}
            </View>
            <Text className="text-xs font-semibold text-primary-600">
              Visit store
            </Text>
          </Pressable>
        ) : null}
        </FadeIn>

        <FadeIn delay={180}>
        <View className="mx-4 mt-3 bg-surface rounded-2xl border border-line-light p-4 gap-3">
          <View className="flex-row items-center gap-3">
            <Truck size={18} color="#11ab3a" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-ink">
                Fast delivery
              </Text>
              <Text className="text-xs text-ink-secondary">
                {product.deliveredBy ?? 'Delivered to your doorstep'}
              </Text>
            </View>
          </View>
          {product.isReturnable !== false ? (
            <View className="flex-row items-center gap-3">
              <RotateCcw size={18} color="#11ab3a" />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-ink">
                  {product.returnWindow ?? 7}-day easy returns
                </Text>
                <Text className="text-xs text-ink-secondary">
                  Hassle-free if you change your mind
                </Text>
              </View>
            </View>
          ) : null}
          <View className="flex-row items-center gap-3">
            <ShieldCheck size={18} color="#11ab3a" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-ink">
                Buyer protection
              </Text>
              <Text className="text-xs text-ink-secondary">
                Money back if delivery is damaged or wrong item
              </Text>
            </View>
          </View>
        </View>
        </FadeIn>

        {product.highlights && product.highlights.length > 0 ? (
          <FadeIn delay={240}>
          <View className="mx-4 mt-3 bg-surface rounded-2xl border border-line-light p-4 gap-2">
            <Text className="text-sm font-bold text-ink mb-1">
              Highlights
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {product.highlights.map((h) => (
                <TagChip key={h} label={h} />
              ))}
            </View>
          </View>
          </FadeIn>
        ) : null}

        {product.description ? (
          <FadeIn delay={300}>
          <View className="mx-4 mt-3 bg-surface rounded-2xl border border-line-light p-4 gap-2">
            <Text className="text-sm font-bold text-ink mb-1">
              About this item
            </Text>
            <Text className="text-sm text-ink-secondary leading-relaxed">
              {product.description}
            </Text>
          </View>
          </FadeIn>
        ) : null}

        <FadeIn delay={360}>
        <View className="mt-4 mx-4 gap-3">
          <Text className="text-base font-bold text-ink">Customer reviews</Text>
          <ReviewsSection productId={product.id} />
        </View>
        </FadeIn>

        {product.relatedProducts && product.relatedProducts.length > 0 ? (
          <FadeIn delay={420}>
          <View className="mt-4">
            <ProductRail
              title="You may also like"
              products={product.relatedProducts as Product[]}
            />
          </View>
          </FadeIn>
        ) : null}
      </ScrollView>

      {/* Soft gradient hairline above the bottom CTA bar — visually
          separates the action area from the scrolling content without
          a hard border line. */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)']}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 86,
          height: 24,
        }}
      />
      {inStock ? (
        <View
          className="absolute bottom-0 left-0 right-0 bg-surface px-4 pt-3 pb-6 flex-row gap-3"
          style={{
            shadowColor: '#0c831f',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 8,
            borderTopWidth: 1,
            borderTopColor: '#eef1f4',
          }}
        >
          <Button
            variant="add"
            size="lg"
            className="flex-1"
            onPress={onAdd}
            loading={adding === 'cart'}
            leftIcon={<ShoppingBag size={18} color="#0c831f" />}
          >
            Add to cart
          </Button>
          <Button
            size="lg"
            className="flex-1"
            onPress={onBuyNow}
            loading={adding === 'buy'}
          >
            Buy now
          </Button>
        </View>
      ) : (
        <View
          className="absolute bottom-0 left-0 right-0 bg-surface px-4 pt-3 pb-6"
          style={{
            shadowColor: '#0c831f',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 8,
            borderTopWidth: 1,
            borderTopColor: '#eef1f4',
          }}
        >
          <Button variant="secondary" size="lg" fullWidth disabled>
            Out of stock
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}
