/**
 * Unified wishlist hooks.
 *
 * `useWishlistQuery`     — list of saved products (server or local).
 * `useWishlistIds`       — id-only list, used by product cards/details
 *                          to flip the heart fill state.
 * `useToggleWishlist`    — toggle a product. Server uses the productId only;
 *                          guest needs the full `Product` snapshot (so the
 *                          wishlist screen can render without a backend).
 *
 * When the user signs in, `mergeGuestWishlistIntoServer` (auth-context)
 * replays the saved ids against the server, then the local snapshot
 * cache is cleared.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { wishlistApi, type Product } from '@xelnova/api';
import { useAuth } from './auth-context';
import { queryKeys } from './query-keys';
import { hapticLight, hapticMedium } from './haptics';
import {
  getGuestWishlist,
  getGuestWishlistIds,
  toggleGuestWishlist,
} from './guest-wishlist';

export function useWishlistQuery() {
  const { isAuthenticated, loading } = useAuth();
  return useQuery<Product[]>({
    queryKey: queryKeys.wishlist.items(),
    queryFn: () =>
      isAuthenticated
        ? wishlistApi.getWishlist().catch(() => [])
        : getGuestWishlist(),
    enabled: !loading,
    staleTime: 30_000,
    retry: false,
  });
}

export function useWishlistIds() {
  const { isAuthenticated, loading } = useAuth();
  return useQuery<string[]>({
    queryKey: queryKeys.wishlist.ids(),
    queryFn: () =>
      isAuthenticated
        ? wishlistApi.getWishlistIds().catch(() => [])
        : getGuestWishlistIds(),
    enabled: !loading,
    staleTime: 30_000,
    retry: false,
  });
}

interface ToggleArgs {
  /** Always required so the guest path can store a snapshot. */
  product: Product;
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  return useMutation<{ added: boolean; productId: string }, Error, ToggleArgs>({
    mutationFn: ({ product }) =>
      isAuthenticated
        ? wishlistApi.toggleWishlist(product.id)
        : toggleGuestWishlist(product),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.ids() });
      queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.items() });
      // Heavier tick when adding (so the user feels the "save"),
      // lighter when removing.
      if (result.added) hapticMedium();
      else hapticLight();
    },
  });
}
