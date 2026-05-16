/**
 * Cached delivery locality.
 *
 * Populated when the user grants location in the install-time wizard (we
 * reverse-geocode the device GPS once and cache the resulting label) or
 * by the address book in `/account/addresses` (selected default).
 *
 * Read by the marketplace header to render the "HOME · {city}" pill. We
 * deliberately do not re-prompt for location at the header level — that
 * would defeat the point of the install-time wizard.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const KEY = '@xelnova/locality-v1';

export interface CachedLocality {
  /** Short label shown in the address pill: "HOME", "WORK", "OTHER", "DELIVER TO". */
  tone: 'HOME' | 'WORK' | 'OTHER' | 'DELIVER TO';
  /** Human-readable place — e.g. "New Delhi 110092" or "Bengaluru". */
  label: string;
  pincode: string | null;
  city: string | null;
  state: string | null;
  /** ISO timestamp; we never auto-refresh but it's useful for diagnostics. */
  cachedAt: string;
}

export async function getCachedLocality(): Promise<CachedLocality | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedLocality;
  } catch {
    return null;
  }
}

export async function setCachedLocality(value: CachedLocality): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export async function clearCachedLocality(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}

/**
 * Best-effort: read the device GPS, reverse-geocode it, and cache the
 * resulting locality. Returns the cached value, or `null` if anything
 * failed (permission denied, no signal, geocoder unavailable). Safe to
 * call multiple times — it's idempotent.
 */
export async function tryDetectAndCacheLocality(): Promise<CachedLocality | null> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return null;

    const position = await Location.getLastKnownPositionAsync({
      maxAge: 5 * 60_000,
    });
    const coords =
      position?.coords ??
      (await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(() => null))?.coords;
    if (!coords) return null;

    const places = await Location.reverseGeocodeAsync({
      latitude: coords.latitude,
      longitude: coords.longitude,
    }).catch(() => [] as Location.LocationGeocodedAddress[]);
    const head = places[0];
    if (!head) return null;

    const city =
      head.city ?? head.subregion ?? head.district ?? head.region ?? null;
    const pincode = head.postalCode ?? null;
    const state = head.region ?? null;
    const labelParts = [city, pincode].filter(Boolean) as string[];
    const label = labelParts.length > 0 ? labelParts.join(' ') : 'India';

    const value: CachedLocality = {
      tone: 'DELIVER TO',
      label,
      city,
      pincode,
      state,
      cachedAt: new Date().toISOString(),
    };
    await setCachedLocality(value);
    return value;
  } catch {
    return null;
  }
}
