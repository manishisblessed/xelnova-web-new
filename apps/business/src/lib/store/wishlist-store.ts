import { create } from "zustand";
import { persist } from "zustand/middleware";
import { wishlistApi, getAccessToken } from "@xelnova/api";

interface WishlistState {
  items: string[];
  synced: boolean;
  toggle: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  syncFromServer: () => Promise<void>;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      synced: false,

      toggle: (productId) => {
        const isIn = get().items.includes(productId);
        set((state) => ({
          items: isIn
            ? state.items.filter((id) => id !== productId)
            : [...state.items, productId],
        }));
        if (getAccessToken()) {
          wishlistApi.toggleWishlist(productId).catch(() => {});
        }
      },

      isInWishlist: (productId) => get().items.includes(productId),

      syncFromServer: async () => {
        if (!getAccessToken()) return;
        try {
          const ids = await wishlistApi.getWishlistIds();
          const local = get().items;
          const merged = [...new Set([...ids, ...local])];
          set({ items: merged, synced: true });
          // Sync any local-only items to server
          const serverSet = new Set(ids);
          for (const id of local) {
            if (!serverSet.has(id)) {
              wishlistApi.addToWishlist(id).catch(() => {});
            }
          }
        } catch {
          // Keep local items if server fails
        }
      },
    }),
    { name: "xelnova-wishlist" }
  )
);
