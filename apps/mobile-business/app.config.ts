import type { ExpoConfig } from 'expo/config';

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL?.trim() || 'https://api.xelnova.in/api/v1';

export default (): ExpoConfig => ({
  name: 'Xelnova Business',
  slug: 'xelnova-business',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'in.xelnova.business',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'in.xelnova.business',
    edgeToEdgeEnabled: true,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    apiUrl,
  },
});
