/**
 * Unified cart hooks.
 *
 * `useCartQuery`        — reads the current cart (server or local).
 * `useAddToCart`        — adds an item.
 * `useUpdateCartItem`   — sets quantity for a productId (0 removes).
 * `useRemoveFromCart`   — removes a productId from the cart.
 *
 * The caller never has to think about auth state — the hook checks
 * `useAuth().isAuthenticated` and routes to `cartApi` or the AsyncStorage
 * guest store. The React Query cache key (`queryKeys.cart()`) is shared
 * so a sign-in / sign-out invalidates the badge + cart screen the same way.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi, type Cart } from '@xelnova/api';
import { useAuth } from './auth-context';
import { queryKeys } from './query-keys';
import { hapticError, hapticMedium, hapticSuccess } from './haptics';
import {
  EMPTY_GUEST_CART,
  addToGuestCart,
  getGuestCart,
  removeFromGuestCart,
  updateGuestCartItem,
  type GuestCartItemInput,
} from './guest-cart';

export function useCartQuery() {
  const { isAuthenticated, loading } = useAuth();
  return useQuery<Cart>({
    queryKey: queryKeys.cart(),
    queryFn: () =>
      isAuthenticated
        ? cartApi.getCart().catch(() => EMPTY_GUEST_CART)
        : getGuestCart(),
    enabled: !loading,
    staleTime: 30_000,
    retry: false,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  return useMutation<Cart, Error, GuestCartItemInput>({
    mutationFn: (input) =>
      isAuthenticated
        ? cartApi.addToCart(input.productId, input.quantity, input.variant ?? undefined)
        : addToGuestCart(input),
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart(), cart);
      hapticSuccess();
    },
    onError: () => {
      hapticError();
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  return useMutation<Cart, Error, { productId: string; quantity: number }>({
    mutationFn: ({ productId, quantity }) =>
      isAuthenticated
        ? cartApi.updateCartItem(productId, quantity)
        : updateGuestCartItem(productId, quantity),
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart(), cart);
      hapticMedium();
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  return useMutation<Cart, Error, string>({
    mutationFn: (productId) =>
      isAuthenticated
        ? cartApi.removeFromCart(productId)
        : removeFromGuestCart(productId),
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart(), cart);
      hapticMedium();
    },
  });
}
