'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  createElement,
} from 'react';
import type { AuthUser } from '../types';
import * as authApi from '../auth';
import { setAccessToken } from '../client';
import { configureApiAuthStorage } from '../auth-storage';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export type AuthProviderVariant = 'retail' | 'business';

export function AuthProvider({
  children,
  authStoragePrefix,
  variant = 'retail',
}: {
  children: ReactNode;
  /** e.g. `business` → keys `business:xelnova-refresh-token` */
  authStoragePrefix?: string;
  variant?: AuthProviderVariant;
}) {
  configureApiAuthStorage({ keyPrefix: authStoragePrefix });

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    configureApiAuthStorage({ keyPrefix: authStoragePrefix });
  }, [authStoragePrefix]);

  useEffect(() => {
    let cancelled = false;
    const stored = authApi.getStoredUser();
    if (stored) {
      if (variant === 'business' && stored.role !== 'BUSINESS') {
        authApi.logout().catch(() => {});
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return () => {
          cancelled = true;
        };
      }
      setUser(stored);
      if (typeof document !== 'undefined') {
        const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
        if (m) setAccessToken(decodeURIComponent(m[1]));
      }
      authApi
        .refreshTokens()
        .then((tokens) => {
          if (!cancelled) setAccessToken(tokens.accessToken);
        })
        .catch(() => {
          if (typeof document !== 'undefined') {
            const hasCookie = /(?:^|;\s*)xelnova-token=/.test(document.cookie);
            if (hasCookie) return;
          }
          if (!cancelled) {
            setUser(null);
            authApi.logout();
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [variant]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result =
        variant === 'business'
          ? await authApi.loginBusiness(email, password)
          : await authApi.login(email, password);
      if (variant === 'business' && result.user.role !== 'BUSINESS') {
        await authApi.logout();
        throw new Error('Not a business account');
      }
      setUser(result.user);
    },
    [variant],
  );

  const register = useCallback(
    async (name: string, email: string, password: string, phone?: string) => {
      if (variant === 'business') {
        throw new Error('Use registerBusiness on the business registration page');
      }
      const result = await authApi.register(name, email, password, phone);
      setUser(result.user);
    },
    [variant],
  );

  const logoutFn = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  return createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        loading,
        login,
        register,
        logout: logoutFn,
        isAuthenticated: !!user,
      },
    },
    children,
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
