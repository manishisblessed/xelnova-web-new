/**
 * AsyncStorage-backed guest wishlist.
 *
 * Stores full `Product` snapshots so the wishlist screen can render without
 * a backend round-trip. Snapshots may be slightly stale (price/stock changes
 * are picked up on next view), which is acceptable for browse and matches
 * how Amazon/Flipkart behave for unauthenticated saves.
 *
 * On successful sign-in, `mergeGuestWishlistIntoServer` replays each
 * `productId` against the server wishlist, then `clearGuestWishlist` wipes
 * local state. Conflicts (already saved) are silently ignored.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '@xelnova/api';

const KEY = '@xelnova/guest-wishlist';

async function readSnapshots(): Promise<Product[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Product[]) : [];
  } catch {
    return [];
  }
}

async function writeSnapshots(items: Product[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export async function getGuestWishlist(): Promise<Product[]> {
  return readSnapshots();
}

export async function getGuestWishlistIds(): Promise<string[]> {
  const items = await readSnapshots();
  return items.map((p) => p.id);
}

export async function isInGuestWishlist(productId: string): Promise<boolean> {
  const ids = await getGuestWishlistIds();
  return ids.includes(productId);
}

export async function addToGuestWishlist(
  product: Product,
): Promise<{ added: boolean; productId: string }> {
  const items = await readSnapshots();
  if (items.some((p) => p.id === product.id)) {
    return { added: false, productId: product.id };
  }
  const next = [product, ...items];
  await writeSnapshots(next);
  return { added: true, productId: product.id };
}

export async function removeFromGuestWishlist(
  productId: string,
): Promise<{ removed: boolean; productId: string }> {
  const items = await readSnapshots();
  const next = items.filter((p) => p.id !== productId);
  if (next.length === items.length) {
    return { removed: false, productId };
  }
  await writeSnapshots(next);
  return { removed: true, productId };
}

export async function toggleGuestWishlist(
  product: Product,
): Promise<{ added: boolean; productId: string }> {
  const items = await readSnapshots();
  const exists = items.some((p) => p.id === product.id);
  if (exists) {
    const next = items.filter((p) => p.id !== product.id);
    await writeSnapshots(next);
    return { added: false, productId: product.id };
  }
  const next = [product, ...items];
  await writeSnapshots(next);
  return { added: true, productId: product.id };
}

export async function clearGuestWishlist(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
