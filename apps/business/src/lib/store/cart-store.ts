import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number;
  image: string;
  quantity: number;
  variant?: string;
  seller: string;
  gstRate?: number | null;
}

type NewCartItem = Omit<CartItem, "quantity">;

function sameProduct(a: { productId: string; variant?: string }, b: { productId: string; variant?: string }) {
  return a.productId === b.productId && (a.variant ?? "") === (b.variant ?? "");
}

interface CartState {
  items: CartItem[];
  addItem: (item: NewCartItem, quantity?: number) => void;
  setItemQuantity: (item: NewCartItem, quantity: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  getItemQuantity: (productId: string, variant?: string) => number;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
  totalSavings: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, quantity = 1) =>
        set((state) => {
          const qty = Math.max(1, quantity);
          const idx = state.items.findIndex((i) => sameProduct(i, item));
          if (idx > -1) {
            const updated = [...state.items];
            updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + qty };
            return { items: updated };
          }
          return { items: [...state.items, { ...item, quantity: qty }] };
        }),

      setItemQuantity: (item, quantity) =>
        set((state) => {
          const idx = state.items.findIndex((i) => sameProduct(i, item));
          if (quantity <= 0) {
            return idx > -1
              ? { items: state.items.filter((_, j) => j !== idx) }
              : state;
          }
          if (idx > -1) {
            const updated = [...state.items];
            updated[idx] = { ...updated[idx], quantity };
            return { items: updated };
          }
          return { items: [...state.items, { ...item, quantity }] };
        }),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),

      updateQuantity: (id, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.id !== id)
              : state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        })),

      getItemQuantity: (productId, variant) =>
        get().items.find((i) => sameProduct(i, { productId, variant }))?.quantity ?? 0,

      clearCart: () => set({ items: [] }),

      totalItems: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      totalPrice: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      totalSavings: () =>
        get().items.reduce(
          (sum, item) =>
            sum + Math.max(0, item.comparePrice - item.price) * item.quantity,
          0
        ),
    }),
    { name: "xelnova-cart" }
  )
);
