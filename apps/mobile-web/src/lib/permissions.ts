/**
 * Thin wrappers around the four OS permissions Xelnova asks for at first
 * launch (and from `/account/settings` thereafter):
 *
 *   • Location      — to set the delivery pincode/locality.
 *   • Notifications — for order updates and offers.
 *   • Camera        — for visual product search and return photos.
 *   • Microphone    — for voice search.
 *
 * Each helper returns a `PermissionResult` with the same three states
 * regardless of platform, so the wizard UI can render uniform rows.
 *
 * Notifications are intentionally guarded by `expo-constants` so a request
 * never fires inside Expo Go (where push isn't supported in SDK 53+).
 * Camera / microphone use `expo-image-picker`'s permission helpers — that
 * package is already a dependency, so we don't pull in `expo-camera`.
 */
import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export interface PermissionResult {
  state: PermissionState;
  /**
   * `true` when the OS has permanently denied (e.g. iOS user picked
   * "Don't allow" and the system won't ask again). UI should route the
   * user to system settings instead of re-prompting.
   */
  blocked: boolean;
}

const isExpoGo = Constants.appOwnership === 'expo';

function toResult(perm: {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}): PermissionResult {
  if (perm.granted) return { state: 'granted', blocked: false };
  if (!perm.canAskAgain) return { state: 'denied', blocked: true };
  return { state: 'undetermined', blocked: false };
}

// ─── Location ──────────────────────────────────────────────────────────────

export async function getLocationPermission(): Promise<PermissionResult> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    return toResult(perm);
  } catch {
    return { state: 'undetermined', blocked: false };
  }
}

export async function requestLocationPermission(): Promise<PermissionResult> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    return toResult(perm);
  } catch {
    return { state: 'denied', blocked: false };
  }
}

// ─── Notifications ─────────────────────────────────────────────────────────

interface NotificationsModule {
  getPermissionsAsync: () => Promise<{
    granted: boolean;
    canAskAgain: boolean;
    status: string;
  }>;
  requestPermissionsAsync: () => Promise<{
    granted: boolean;
    canAskAgain: boolean;
    status: string;
  }>;
}

function getNotificationsModule(): NotificationsModule | null {
  if (isExpoGo) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

export async function getNotificationPermission(): Promise<PermissionResult> {
  const N = getNotificationsModule();
  if (!N) return { state: 'undetermined', blocked: false };
  try {
    const perm = await N.getPermissionsAsync();
    return toResult(perm);
  } catch {
    return { state: 'undetermined', blocked: false };
  }
}

export async function requestNotificationPermission(): Promise<PermissionResult> {
  const N = getNotificationsModule();
  if (!N) {
    // In Expo Go we can't grant — surface as "denied" so the wizard moves on.
    return { state: 'denied', blocked: false };
  }
  try {
    const perm = await N.requestPermissionsAsync();
    return toResult(perm);
  } catch {
    return { state: 'denied', blocked: false };
  }
}

// ─── Camera ────────────────────────────────────────────────────────────────

export async function getCameraPermission(): Promise<PermissionResult> {
  try {
    const perm = await ImagePicker.getCameraPermissionsAsync();
    return toResult(perm);
  } catch {
    return { state: 'undetermined', blocked: false };
  }
}

export async function requestCameraPermission(): Promise<PermissionResult> {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    return toResult(perm);
  } catch {
    return { state: 'denied', blocked: false };
  }
}

// ─── Microphone ────────────────────────────────────────────────────────────

// `expo-image-picker` exposes mic permission helpers because video capture
// needs it. We piggyback on those so we don't have to add another module
// just for voice search.
export async function getMicrophonePermission(): Promise<PermissionResult> {
  try {
    const perm = await ImagePicker.getMicrophonePermissionsAsync();
    return toResult(perm);
  } catch {
    return { state: 'undetermined', blocked: false };
  }
}

export async function requestMicrophonePermission(): Promise<PermissionResult> {
  try {
    const perm = await ImagePicker.requestMicrophonePermissionsAsync();
    return toResult(perm);
  } catch {
    return { state: 'denied', blocked: false };
  }
}

// ─── Settings deep-link ────────────────────────────────────────────────────

/**
 * Opens the OS settings page for our app, where the user can flip a
 * previously-blocked permission. Falls back silently if the platform
 * surface refuses to open (e.g. very old Android builds).
 */
export function openAppSettings(): void {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:').catch(() => {});
  } else {
    Linking.openSettings().catch(() => {});
  }
}
