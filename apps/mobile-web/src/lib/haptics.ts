import { Platform } from 'react-native';

/**
 * Thin wrapper around `expo-haptics`.
 *
 * - On web, `expo-haptics` is a no-op but still imports cleanly. We
 *   short-circuit there anyway to skip the require cost.
 * - In Expo Go and dev/production builds the native module is wired up
 *   via the Expo Modules autolinker, so a direct require is safe.
 *
 * All helpers are fire-and-forget — never await, never throw. Haptics
 * are pure feedback and must not gate a user action.
 */

type HapticsModule = typeof import('expo-haptics');

let cached: HapticsModule | null | undefined;

function getHaptics(): HapticsModule | null {
  if (Platform.OS === 'web') return null;
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    cached = require('expo-haptics') as HapticsModule;
  } catch {
    cached = null;
  }
  return cached;
}

/** Light, transient tick — used for soft taps (chips, tile press). */
export function hapticSelection(): void {
  const h = getHaptics();
  if (!h) return;
  void h.selectionAsync().catch(() => undefined);
}

/** Light impact — used for subtle button presses. */
export function hapticLight(): void {
  const h = getHaptics();
  if (!h) return;
  void h
    .impactAsync(h.ImpactFeedbackStyle.Light)
    .catch(() => undefined);
}

/** Medium impact — used for primary actions (add to cart, copy code). */
export function hapticMedium(): void {
  const h = getHaptics();
  if (!h) return;
  void h
    .impactAsync(h.ImpactFeedbackStyle.Medium)
    .catch(() => undefined);
}

/** Heavy impact — reserve for destructive / important confirmations. */
export function hapticHeavy(): void {
  const h = getHaptics();
  if (!h) return;
  void h
    .impactAsync(h.ImpactFeedbackStyle.Heavy)
    .catch(() => undefined);
}

/** Success notification — order placed, login complete. */
export function hapticSuccess(): void {
  const h = getHaptics();
  if (!h) return;
  void h
    .notificationAsync(h.NotificationFeedbackType.Success)
    .catch(() => undefined);
}

/** Warning notification — soft fail (out of stock, etc). */
export function hapticWarning(): void {
  const h = getHaptics();
  if (!h) return;
  void h
    .notificationAsync(h.NotificationFeedbackType.Warning)
    .catch(() => undefined);
}

/** Error notification — hard fail (form validation, network). */
export function hapticError(): void {
  const h = getHaptics();
  if (!h) return;
  void h
    .notificationAsync(h.NotificationFeedbackType.Error)
    .catch(() => undefined);
}
