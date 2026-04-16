import * as SecureStore from 'expo-secure-store';
import type { AuthUser, TokenPersistence } from '@xelnova/api';

const K = {
  access: 'xn-business-access',
  refresh: 'xn-business-refresh',
  user: 'xn-business-user',
};

export const businessTokenPersistence: TokenPersistence = {
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
