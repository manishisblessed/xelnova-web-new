/**
 * AsyncStorage-backed history of user-visited products and recent search
 * queries. These are non-secret, ephemeral, and safe to store unencrypted.
 *
 * All write paths are best-effort — failures are swallowed so a flaky
 * storage layer never breaks navigation.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_RECENT_PRODUCTS = '@xelnova/recent-products';
const KEY_RECENT_SEARCHES = '@xelnova/recent-searches';
const KEY_ONBOARDING = '@xelnova/onboarded-v1';
const KEY_PERMISSIONS = '@xelnova/permissions-v1';

const MAX_PRODUCTS = 20;
const MAX_SEARCHES = 10;

export interface RecentProduct {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  compareAtPrice: number | null;
  brand: string | null;
  rating: number;
  reviewCount: number;
  /** ISO-8601 timestamp of last view. */
  viewedAt: string;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export async function getRecentProducts(): Promise<RecentProduct[]> {
  const list = await readJson<RecentProduct[]>(KEY_RECENT_PRODUCTS, []);
  return Array.isArray(list) ? list : [];
}

export async function recordRecentProduct(
  product: Omit<RecentProduct, 'viewedAt'>,
): Promise<void> {
  const list = await getRecentProducts();
  const next = [
    { ...product, viewedAt: new Date().toISOString() },
    ...list.filter((p) => p.id !== product.id),
  ].slice(0, MAX_PRODUCTS);
  await writeJson(KEY_RECENT_PRODUCTS, next);
}

export async function clearRecentProducts(): Promise<void> {
  await AsyncStorage.removeItem(KEY_RECENT_PRODUCTS).catch(() => {});
}

export async function getRecentSearches(): Promise<string[]> {
  const list = await readJson<string[]>(KEY_RECENT_SEARCHES, []);
  return Array.isArray(list) ? list : [];
}

export async function recordRecentSearch(query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;
  const list = await getRecentSearches();
  const next = [trimmed, ...list.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(
    0,
    MAX_SEARCHES,
  );
  await writeJson(KEY_RECENT_SEARCHES, next);
}

export async function clearRecentSearches(): Promise<void> {
  await AsyncStorage.removeItem(KEY_RECENT_SEARCHES).catch(() => {});
}

export async function hasOnboarded(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY_ONBOARDING);
    return raw === '1';
  } catch {
    return true;
  }
}

export async function markOnboarded(): Promise<void> {
  await AsyncStorage.setItem(KEY_ONBOARDING, '1').catch(() => {});
}

/** Reset onboarding flag — exposed for the dev menu / "reset" affordance. */
export async function resetOnboarded(): Promise<void> {
  await AsyncStorage.removeItem(KEY_ONBOARDING).catch(() => {});
}

/**
 * Returns `true` once the user has completed (or skipped) the install-time
 * permissions wizard. We never re-prompt automatically — users can change
 * grants later from `/account/settings`.
 */
export async function hasCompletedPermissions(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PERMISSIONS);
    return raw === '1';
  } catch {
    // If storage is broken, treat the wizard as done so we never show it
    // forever. The user can still grant permissions from settings.
    return true;
  }
}

export async function markPermissionsCompleted(): Promise<void> {
  await AsyncStorage.setItem(KEY_PERMISSIONS, '1').catch(() => {});
}

/** Reset permissions flag — dev-menu affordance. */
export async function resetPermissionsCompleted(): Promise<void> {
  await AsyncStorage.removeItem(KEY_PERMISSIONS).catch(() => {});
}
