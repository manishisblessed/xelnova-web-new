'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, createElement } from 'react';
import type { AuthUser } from '../types';
import * as authApi from '../auth';
import { setAccessToken } from '../client';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children, requiredRole }: { children: ReactNode; requiredRole?: string }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const stored = authApi.getStoredUser();
    if (stored) {
      setUser(stored);
      // Also sync the access token from cookie if available
      if (typeof document !== 'undefined') {
        const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
        if (m) setAccessToken(decodeURIComponent(m[1]));
      }
      authApi.refreshTokens()
        .then((tokens) => {
          if (!cancelled) setAccessToken(tokens.accessToken);
        })
        .catch(() => {
          // Don't clear user if we have a valid cookie — token refresh may just be temporarily unavailable
          if (typeof document !== 'undefined') {
            const hasCookie = /(?:^|;\s*)xelnova-token=/.test(document.cookie);
            if (hasCookie) return;
          }
          if (!cancelled) {
            setUser(null);
            authApi.logout();
          }
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    } else {
      setLoading(false);
    }
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    setUser(result.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, phone?: string) => {
    const result = await authApi.register(name, email, password, phone);
    setUser(result.user);
  }, []);

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
