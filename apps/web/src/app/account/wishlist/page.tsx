"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Heart, Loader2 } from "lucide-react";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { wishlistApi, setAccessToken } from "@xelnova/api";
import { ProductCard } from "@/components/marketplace/product-card";

function syncToken() {
  if (typeof document === "undefined") return;
  const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
  if (m) setAccessToken(decodeURIComponent(m[1]));
}

export default function WishlistPage() {
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const syncFromServerFn = useWishlistStore((s) => s.syncFromServer);
  const syncFromServer = useCallback(() => { syncFromServerFn(); }, [syncFromServerFn]);

  useEffect(() => {
    setMounted(true);
    syncToken();
    syncFromServer();
    wishlistApi.getWishlist()
      .then((data) => setProducts(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [syncFromServer]);

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const mappedProducts = products.map((p: any) => ({
    ...p,
    compareAtPrice: p.compareAtPrice ?? 0,
    brand: p.brand || "",
    category: p.category?.name || "",
    tags: p.tags || [],
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">
          My Wishlist ({mappedProducts.length})
        </h2>
      </div>

      {mappedProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white py-16 text-center shadow-card">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="rounded-full bg-danger-50 p-5 mb-4 mx-auto w-fit">
              <Heart size={36} className="text-danger-400" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">Your wishlist is empty</h3>
            <p className="mt-1 text-sm text-text-secondary max-w-xs mx-auto">
              Save items you love to buy them later.
            </p>
            <Link
              href="/products"
              className="mt-5 inline-block rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-primary"
            >
              Browse Products
            </Link>
          </motion.div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-5">
          {mappedProducts.map((product: any, i: number) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
