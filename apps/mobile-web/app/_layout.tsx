import '../global.css';

import { useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  configureTokenPersistence,
  setApiBaseURL,
  setAppRole,
} from '@xelnova/api';
import { setHapticsHandler } from '@xelnova/ui-native';

import { customerTokenPersistence } from '../src/lib/persistence';
import { AuthProvider } from '../src/lib/auth-context';
import { makeQueryClient } from '../src/lib/query-client';
import { getApiUrl } from '../src/lib/env';
import {
  hapticHeavy,
  hapticLight,
  hapticMedium,
  hapticSelection,
} from '../src/lib/haptics';
import { NotificationsBootstrap } from '../src/components/notifications-bootstrap';
import { ErrorBoundary } from '../src/components/error-boundary';
import { OnboardingGate } from '../src/components/onboarding-gate';

// Run module-level so the api client is configured before any screen
// imports it. Order matters: role first → base URL → persistence.
setAppRole('CUSTOMER');
setApiBaseURL(getApiUrl());
configureTokenPersistence(customerTokenPersistence);

// Wire shared `PressableScale` (and any other ui-native consumer) into
// `expo-haptics` once. Keeping this here means `@xelnova/ui-native` never
// needs to know about the haptics package directly.
setHapticsHandler((kind) => {
  switch (kind) {
    case 'selection':
      hapticSelection();
      return;
    case 'light':
      hapticLight();
      return;
    case 'medium':
      hapticMedium();
      return;
    case 'heavy':
      hapticHeavy();
      return;
    default:
      return;
  }
});

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = makeQueryClient();

export default function RootLayout() {
  const hideSplash = useCallback(async () => {
    await SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    hideSplash();
  }, [hideSplash]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <NotificationsBootstrap />
              <OnboardingGate />
              <StatusBar style="dark" backgroundColor="#E6F4F0" translucent={false} />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                  contentStyle: { backgroundColor: '#f8fafb' },
                }}
              />
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
