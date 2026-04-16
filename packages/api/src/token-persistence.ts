import type { AuthUser } from './types';

/**
 * Optional async token store for React Native (SecureStore / AsyncStorage).
 * When set, `auth` and `client` use this instead of `localStorage`.
 */
export interface TokenPersistence {
  getRefreshToken(): Promise<string | null>;
  getAccessToken(): Promise<string | null>;
  getUserJson(): Promise<string | null>;
  setTokens(accessToken: string, refreshToken: string, user: AuthUser): Promise<void>;
  clear(): Promise<void>;
}

let persistence: TokenPersistence | null = null;

export function configureTokenPersistence(store: TokenPersistence | null) {
  persistence = store;
}

export function getTokenPersistence(): TokenPersistence | null {
  return persistence;
}
