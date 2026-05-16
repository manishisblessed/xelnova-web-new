/**
 * AsyncStorage-backed guest cart.
 *
 * Mirrors the server `Cart` shape so consumers can swap between guest and
 * authenticated carts behind a single hook (`useCart` / `useCartQuery`).
 * On successful sign-in `mergeGuestCartIntoServer` (auth-context) replays
 * each item against the server, then `clearGuestCart` wipes local state.
 *
 * All writes are best-effort — a flaky storage layer never breaks the cart.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Cart, CartItem, CartSummary } from '@xelnova/api';

const KEY = '@xelnova/guest-cart';

export interface GuestCartItemInput {
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  price: number;
  compareAtPrice: number | null;
  brand: string | null;
  sellerId: string;
  stock: number;
  variant?: string | null;
  quantity: number;
}

export interface GuestCartMergeItem {
  productId: string;
  quantity: number;
  variant: string | null;
}

const EMPTY_SUMMARY: CartSummary = {
  subtotal: 0,
  discount: 0,
  shipping: 0,
  tax: 0,
  total: 0,
  itemCount: 0,
};

export const EMPTY_GUEST_CART: Cart = {
  items: [],
  coupon: null,
  summary: EMPTY_SUMMARY,
};

function makeId(productId: string, variant: string | null): string {
  return `local-${productId}-${variant ?? 'default'}`;
}

async function readItems(): Promise<CartItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

async function writeItems(items: CartItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

function computeSummary(items: CartItem[]): CartSummary {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  return {
    subtotal,
    discount: 0,
    shipping: 0,
    tax: 0,
    total: subtotal,
    itemCount,
  };
}

function asCart(items: CartItem[]): Cart {
  return { items, coupon: null, summary: computeSummary(items) };
}

function clampQuantity(quantity: number, stock: number): number {
  if (!Number.isFinite(stock) || stock <= 0) return Math.max(0, quantity);
  return Math.max(0, Math.min(quantity, stock));
}

export async function getGuestCart(): Promise<Cart> {
  const items = await readItems();
  return asCart(items);
}

export async function addToGuestCart(input: GuestCartItemInput): Promise<Cart> {
  const variant = input.variant ?? null;
  const id = makeId(input.productId, variant);
  const items = await readItems();
  const existing = items.find((i) => i.id === id);
  let next: CartItem[];
  if (existing) {
    next = items.map((i) =>
      i.id === id
        ? { ...i, quantity: clampQuantity(i.quantity + input.quantity, i.stock) }
        : i,
    );
  } else {
    const newItem: CartItem = {
      id,
      productId: input.productId,
      productName: input.productName,
      productSlug: input.productSlug,
      productImage: input.productImage,
      price: input.price,
      compareAtPrice: input.compareAtPrice,
      quantity: clampQuantity(input.quantity, input.stock),
      variant,
      brand: input.brand,
      sellerId: input.sellerId,
      stock: input.stock,
    };
    next = [...items, newItem];
  }
  await writeItems(next);
  return asCart(next);
}

export async function updateGuestCartItem(
  productId: string,
  quantity: number,
): Promise<Cart> {
  const items = await readItems();
  const next: CartItem[] =
    quantity <= 0
      ? items.filter((i) => i.productId !== productId)
      : items.map((i) =>
          i.productId === productId
            ? { ...i, quantity: clampQuantity(quantity, i.stock) }
            : i,
        );
  await writeItems(next);
  return asCart(next);
}

export async function removeFromGuestCart(productId: string): Promise<Cart> {
  return updateGuestCartItem(productId, 0);
}

export async function clearGuestCart(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}

/**
 * Snapshot the guest cart as merge-friendly tuples. Used by auth-context
 * after a successful sign-in to replay each item against the server cart.
 */
export async function getGuestCartItemsForMerge(): Promise<GuestCartMergeItem[]> {
  const items = await readItems();
  return items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    variant: i.variant,
  }));
}
