/**
 * Customer-app auth context.
 *
 * Wraps the platform-agnostic helpers exposed by `@xelnova/api` (login,
 * register, logout, hydrateAuthFromPersistence, …) with a tiny React Context
 * so the rest of the mobile app can consume `useAuth()` the same way the web
 * app does.
 *
 * Note: the `AuthProvider` exported from `@xelnova/api/hooks` is **web-only** —
 * it touches `localStorage` and `document.cookie`. We can't reuse it here, but
 * we can reuse every imperative helper underneath it.
 *
 * On every successful sign-in or registration we also merge the guest cart
 * + wishlist (if any) into the freshly-authenticated server account so the
 * user keeps everything they collected while browsing as a guest. The merge
 * is best-effort — individual stock/price failures are swallowed.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  authApi,
  cartApi,
  hydrateAuthFromPersistence,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  wishlistApi,
  type AuthUser,
} from '@xelnova/api';
import {
  clearGuestCart,
  getGuestCartItemsForMerge,
} from './guest-cart';
import {
  clearGuestWishlist,
  getGuestWishlistIds,
} from './guest-wishlist';
import { queryKeys } from './query-keys';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    phone?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  resetPassword: (
    token: string,
    newPassword: string,
  ) => Promise<{ message: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function mergeGuestCartIntoServer(): Promise<void> {
  const items = await getGuestCartItemsForMerge();
  if (items.length === 0) return;
  for (const item of items) {
    try {
      await cartApi.addToCart(item.productId, item.quantity, item.variant ?? undefined);
    } catch {
      // Skip silently — stock may have changed, item may be unavailable.
    }
  }
  await clearGuestCart();
}

async function mergeGuestWishlistIntoServer(): Promise<void> {
  const ids = await getGuestWishlistIds();
  if (ids.length === 0) return;
  for (const id of ids) {
    try {
      await wishlistApi.addToWishlist(id);
    } catch {
      // Already saved or invalid — skip.
    }
  }
  await clearGuestWishlist();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    hydrateAuthFromPersistence()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onAuthenticated = useCallback(async () => {
    // Run merges in parallel — they hit independent endpoints.
    await Promise.all([
      mergeGuestCartIntoServer(),
      mergeGuestWishlistIntoServer(),
    ]);
    // Force the next read to come from the server now that local items
    // have been replayed and cleared.
    queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
    queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.items() });
    queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.ids() });
  }, [queryClient]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiLogin(email.trim(), password);
      setUser(res.user);
      await onAuthenticated();
    },
    [onAuthenticated],
  );

  const register = useCallback(
    async (name: string, email: string, password: string, phone?: string) => {
      const res = await apiRegister(name.trim(), email.trim(), password, phone);
      setUser(res.user);
      await onAuthenticated();
    },
    [onAuthenticated],
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      // Drop any cached server cart/wishlist so the next read swaps to the
      // (empty) guest store.
      queryClient.removeQueries({ queryKey: queryKeys.cart() });
      queryClient.removeQueries({ queryKey: queryKeys.wishlist.items() });
      queryClient.removeQueries({ queryKey: queryKeys.wishlist.ids() });
    }
  }, [queryClient]);

  const forgotPassword = useCallback(
    (email: string) => authApi.forgotPassword(email.trim()),
    [],
  );

  const resetPassword = useCallback(
    (token: string, newPassword: string) =>
      authApi.resetPassword(token, newPassword),
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      forgotPassword,
      resetPassword,
    }),
    [user, loading, login, register, logout, forgotPassword, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
