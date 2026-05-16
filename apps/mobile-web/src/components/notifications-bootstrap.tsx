import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth-context';
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  isExpoGo,
  notificationHref,
  registerForPushNotificationsAsync,
} from '../lib/push-notifications';
import { queryKeys } from '../lib/query-keys';

/**
 * Headless component mounted under `<AuthProvider>`. Responsible for:
 *
 *   1. Registering the device's Expo push token whenever the user signs in.
 *   2. Listening for foreground delivery so we can refresh the in-app inbox.
 *   3. Listening for tap-to-open events so we can deep-link to the matching
 *      screen (mirrors the web `getNotificationHref` behavior).
 *
 * In Expo Go (SDK 53+) the native push module is unavailable, so the
 * wrappers below silently degrade to no-ops.
 */
export function NotificationsBootstrap() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // Register / refresh push token whenever auth toggles on.
  useEffect(() => {
    if (!isAuthenticated || isExpoGo) return;
    registerForPushNotificationsAsync().catch(() => {});
  }, [isAuthenticated]);

  // Foreground deliveries: invalidate the inbox so the bell badge updates.
  useEffect(() => {
    const sub = addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
    });
    return () => sub.remove();
  }, [queryClient]);

  // Tap-to-open: route to the relevant screen.
  useEffect(() => {
    const sub = addNotificationResponseReceivedListener((data) => {
      const type = (data.type as string | undefined) ?? null;
      const href = notificationHref(type, data);
      if (href) {
        router.push(href);
      }
    });
    return () => sub.remove();
  }, [router]);

  return null;
}
