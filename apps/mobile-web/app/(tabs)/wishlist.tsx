import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart } from 'lucide-react-native';
import { ProductGrid } from '../../src/components/product-grid';
import { BrandedEmptyState } from '../../src/components/branded-empty-state';
import { useWishlistQuery } from '../../src/lib/use-wishlist';

export default function WishlistScreen() {
  const { data: items, isLoading } = useWishlistQuery();
  const count = items?.length ?? 0;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-raised">
      <View className="bg-surface border-b border-line-light px-4 py-3 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-lg font-bold text-ink">Wishlist</Text>
          <Text className="text-xs text-ink-muted mt-0.5">
            {count} saved {count === 1 ? 'item' : 'items'}
          </Text>
        </View>
        {count > 0 ? (
          <View
            className="flex-row items-center gap-1.5 bg-promo-peach-50 rounded-full px-3 py-1.5 border border-line-light"
          >
            <Heart size={12} color="#ef4444" fill="#ef4444" />
            <Text className="text-[11px] font-extrabold text-ink uppercase tracking-wider">
              {count}
            </Text>
          </View>
        ) : null}
      </View>

      {!isLoading && count === 0 ? (
        <BrandedEmptyState
          Icon={Heart}
          title="Your wishlist is empty"
          subtitle="Tap the heart on any product to save it for later. Your saved items will appear here."
          primaryLabel="Discover products"
          primaryHref="/"
          secondaryLabel="Or jump to your cart"
          secondaryHref="/cart"
          halo={['#fee2e2', '#fecaca']}
          accent="#dc2626"
        />
      ) : (
        <ProductGrid
          products={items ?? []}
          isLoading={isLoading}
          emptyTitle="No saved items"
        />
      )}
    </SafeAreaView>
  );
}
