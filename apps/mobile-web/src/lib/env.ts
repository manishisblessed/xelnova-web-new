import Constants from 'expo-constants';

interface AppExtra {
  apiUrl?: string;
}

export function getApiUrl(): string {
  const extra = Constants.expoConfig?.extra as AppExtra | undefined;
  return extra?.apiUrl?.trim() || 'https://api.xelnova.in/api/v1';
}
