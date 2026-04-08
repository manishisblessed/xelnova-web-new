'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export type DashboardRole = 'admin' | 'seller';

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  role: DashboardRole;
  avatar?: string | null;
}

const STORAGE_KEY = 'xelnova-dashboard-user';

interface DashboardAuthContextType {
  user: DashboardUser | null;
  setUser: (u: DashboardUser | null) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const DashboardAuthContext = createContext<DashboardAuthContextType | null>(null);

export function DashboardAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<DashboardUser | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUserState(JSON.parse(stored));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const setUser = useCallback((u: DashboardUser | null) => {
    setUserState(u);
    if (typeof window !== 'undefined') {
      if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/session', { method: 'DELETE', credentials: 'include' });
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  }, [setUser]);

  return (
    <DashboardAuthContext.Provider value={{ user, setUser, logout, isAuthenticated: !!user }}>
      {children}
    </DashboardAuthContext.Provider>
  );
}

export function useDashboardAuth(): DashboardAuthContextType {
  const ctx = useContext(DashboardAuthContext);
  if (!ctx) throw new Error('useDashboardAuth must be used within DashboardAuthProvider');
  return ctx;
}
