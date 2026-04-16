import * as SecureStore from 'expo-secure-store';
import type { AuthUser, TokenPersistence } from '@xelnova/api';

const K = {
  access: 'xn-seller-access',
  refresh: 'xn-seller-refresh',
  user: 'xn-seller-user',
};

export const sellerTokenPersistence: TokenPersistence = {
  getRefreshToken: () => SecureStore.getItemAsync(K.refresh),
  getAccessToken: () => SecureStore.getItemAsync(K.access),
  getUserJson: () => SecureStore.getItemAsync(K.user),
  setTokens: async (accessToken: string, refreshToken: string, user: AuthUser) => {
    await SecureStore.setItemAsync(K.access, accessToken);
    await SecureStore.setItemAsync(K.refresh, refreshToken);
    await SecureStore.setItemAsync(K.user, JSON.stringify(user));
  },
  clear: async () => {
    await SecureStore.deleteItemAsync(K.access).catch(() => {});
    await SecureStore.deleteItemAsync(K.refresh).catch(() => {});
    await SecureStore.deleteItemAsync(K.user).catch(() => {});
  },
};
