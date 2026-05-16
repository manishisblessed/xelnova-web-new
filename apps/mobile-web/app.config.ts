import type { ExpoConfig } from 'expo/config';

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL?.trim() || 'https://api.xelnova.in/api/v1';

export default (): ExpoConfig => ({
  name: 'Xelnova',
  slug: 'xelnova-customer',
  scheme: 'xelnova',
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
    bundleIdentifier: 'in.xelnova.customer',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'in.xelnova.customer',
    edgeToEdgeEnabled: true,
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    [
      'expo-router',
      {
        origin: 'https://xelnova.in',
      },
    ],
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#11ab3a',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Xelnova uses your photos to attach images to return requests and visual product search.',
        cameraPermission:
          'Xelnova uses your camera for visual product search, profile photos, and return photos.',
        microphonePermission:
          'Xelnova uses your microphone for voice search across products.',
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Xelnova uses your location to set your delivery address and show items that ship to your area.',
        locationWhenInUsePermission:
          'Xelnova uses your location to set your delivery address and show items that ship to your area.',
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl,
    router: {
      origin: false,
    },
  },
});
