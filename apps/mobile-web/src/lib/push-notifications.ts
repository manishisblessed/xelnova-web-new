import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { notificationsApi } from '@xelnova/api';
import type { Href } from 'expo-router';

/**
 * Push notifications wrapper.
 *
 * IMPORTANT: With Expo SDK 53+, `expo-notifications` no longer ships the
 * remote-push native module inside Expo Go. Even *importing* the package
 * at module scope triggers an auto-registration side effect that logs a
 * loud red error in Expo Go. To keep `npm run dev` clean while still
 * supporting development/production builds, we:
 *
 *   1. Detect Expo Go via `Constants.appOwnership`.
 *   2. Lazy-`require` `expo-notifications` only outside Expo Go.
 *   3. Expose safe wrappers (listeners, permission helpers) so feature
 *      code never imports `expo-notifications` directly.
 */

export const isExpoGo: boolean = Constants.appOwnership === 'expo';

type NotificationsModule = typeof import('expo-notifications');

let cachedModule: NotificationsModule | null = null;
let handlerConfigured = false;

function getNotifications(): NotificationsModule | null {
  if (isExpoGo) return null;
  if (cachedModule) return cachedModule;
  // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
  const mod = require('expo-notifications') as NotificationsModule;
  cachedModule = mod;
  if (!handlerConfigured) {
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerConfigured = true;
  }
  return mod;
}

export type NotificationSubscription = { remove: () => void };
const NOOP_SUBSCRIPTION: NotificationSubscription = { remove: () => {} };

let registrationInFlight: Promise<string | null> | null = null;
let lastRegisteredToken: string | null = null;

async function ensureAndroidChannel(N: NotificationsModule) {
  if (Platform.OS !== 'android') return;
  await N.setNotificationChannelAsync('default', {
    name: 'General',
    importance: N.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#11ab3a',
    enableVibrate: true,
  });
}

async function requestPermission(N: NotificationsModule): Promise<boolean> {
  const settings = await N.getPermissionsAsync();
  if (settings.granted) return true;
  if (settings.canAskAgain === false) return false;
  const next = await N.requestPermissionsAsync();
  return next.granted;
}

function getProjectId(): string | undefined {
  const expoCfg: any = Constants.expoConfig ?? {};
  return (
    expoCfg?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId ??
    undefined
  );
}

/**
 * Idempotent: call as often as you like (e.g. on app start, on auth change).
 * Returns the registered token, or `null` if registration failed/declined
 * or the app is running inside Expo Go.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (registrationInFlight) return registrationInFlight;
  const N = getNotifications();
  if (!N) return null;

  registrationInFlight = (async () => {
    try {
      if (!Device.isDevice) {
        return null;
      }
      await ensureAndroidChannel(N);
      const granted = await requestPermission(N);
      if (!granted) return null;

      const projectId = getProjectId();
      const tokenResponse = await N.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      const token = tokenResponse?.data ?? null;
      if (!token) return null;

      if (token !== lastRegisteredToken) {
        try {
          await notificationsApi.registerPushToken(
            token,
            Platform.OS === 'ios' ? 'ios' : 'android',
          );
          lastRegisteredToken = token;
        } catch {
          // Don't fail the app on a backend hiccup; we'll retry next launch.
        }
      }
      return token;
    } catch {
      return null;
    } finally {
      registrationInFlight = null;
    }
  })();

  return registrationInFlight;
}

/**
 * Whether the OS-level notification permission is currently granted.
 * Returns `false` in Expo Go (no native module available).
 */
export async function getPushPermissionGranted(): Promise<boolean> {
  const N = getNotifications();
  if (!N) return false;
  try {
    const p = await N.getPermissionsAsync();
    return p.granted;
  } catch {
    return false;
  }
}

/** Subscribe to foreground deliveries. No-op in Expo Go. */
export function addNotificationReceivedListener(
  callback: () => void,
): NotificationSubscription {
  const N = getNotifications();
  if (!N) return NOOP_SUBSCRIPTION;
  const sub = N.addNotificationReceivedListener(() => callback());
  return { remove: () => sub.remove() };
}

/** Subscribe to user taps on notifications. No-op in Expo Go. */
export function addNotificationResponseReceivedListener(
  callback: (data: Record<string, unknown>) => void,
): NotificationSubscription {
  const N = getNotifications();
  if (!N) return NOOP_SUBSCRIPTION;
  const sub = N.addNotificationResponseReceivedListener((response) => {
    const content = response.notification.request.content;
    const data = (content.data ?? {}) as Record<string, unknown>;
    callback(data);
  });
  return { remove: () => sub.remove() };
}

/**
 * Map a notification's `type` + `data` payload to an Expo Router href.
 * Mirrors what the web app does in `getNotificationHref` so backend payloads
 * keep working unchanged.
 */
export function notificationHref(
  type: string | null | undefined,
  data: Record<string, unknown> | null | undefined,
): Href | null {
  const payload = (data ?? {}) as Record<string, string | undefined>;
  const orderNumber = payload.orderNumber;
  switch ((type ?? '').toUpperCase()) {
    case 'ORDER_PLACED':
    case 'ORDER_CONFIRMED':
    case 'ORDER_SHIPPED':
    case 'ORDER_OUT_FOR_DELIVERY':
    case 'ORDER_DELIVERED':
    case 'ORDER_CANCELLED':
    case 'ORDER_PAYMENT_FAILED':
      if (orderNumber) {
        return {
          pathname: '/account/orders/[orderNumber]',
          params: { orderNumber },
        };
      }
      return '/account/orders';
    case 'RETURN_REQUESTED':
    case 'RETURN_APPROVED':
    case 'RETURN_REJECTED':
    case 'RETURN_REFUNDED':
      return '/account/returns';
    case 'WALLET_CREDITED':
    case 'WALLET_DEBITED':
    case 'WALLET_REFUND':
      return '/account/wallet';
    case 'TICKET_REPLY':
    case 'TICKET_CLOSED':
      if (payload.ticketId) {
        return {
          pathname: '/account/support/[id]',
          params: { id: payload.ticketId },
        };
      }
      return '/account/support';
    case 'PROMO':
    case 'OFFER':
      if (payload.productSlug) {
        return {
          pathname: '/products/[slug]',
          params: { slug: payload.productSlug },
        };
      }
      return '/(tabs)';
    default:
      return null;
  }
}
