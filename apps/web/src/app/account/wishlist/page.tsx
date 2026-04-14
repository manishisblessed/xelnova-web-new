"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Heart, Loader2, ShoppingCart, Trash2, AlertCircle } from "lucide-react";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { useCartStore } from "@/lib/store/cart-store";
import { wishlistApi, setAccessToken } from "@xelnova/api";
import { formatCurrency } from "@xelnova/utils";

function syncToken() {
  if (typeof document === "undefined") return;
  const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
  if (m) setAccessToken(decodeURIComponent(m[1]));
}

export default function WishlistPage() {
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movingToCart, setMovingToCart] = useState<Set<string>>(new Set());
  const syncFromServerFn = useWishlistStore((s) => s.syncFromServer);
  const toggle = useWishlistStore((s) => s.toggle);
  const addToCart = useCartStore((s) => s.addItem);
  const syncFromServer = useCallback(() => { syncFromServerFn(); }, [syncFromServerFn]);

  useEffect(() => {
    setMounted(true);
    syncToken();
    syncFromServer();
    wishlistApi.getWishlist()
      .then((data) => setProducts(data || []))
      .catch((e) => setError(e?.message || "Failed to load wishlist"))
      .finally(() => setLoading(false));
  }, [syncFromServer]);

  const handleRemove = (productId: string) => {
    toggle(productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleMoveToCart = async (product: any) => {
    setMovingToCart((prev) => new Set(prev).add(product.id));
    try {
      addToCart({
        id: product.id,
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        comparePrice: product.compareAtPrice ?? product.price,
        image: product.images?.[0] || "",
        seller: product.seller?.storeName || "",
      });
      toggle(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } finally {
      setMovingToCart((prev) => { const next = new Set(prev); next.delete(product.id); return next; });
    }
  };

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger-200 bg-danger-50 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-danger-500" />
        <p className="mt-3 text-sm text-text-primary">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">
          My Wishlist ({products.length})
        </h2>
      </div>

      {products.length === 0 ? (
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
        <div className="space-y-3">
          {products.map((product: any, i: number) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-card"
            >
              <Link href={`/products/${product.slug}`} className="relative h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-gray-50">
                {product.images?.[0] ? (
                  <Image src={product.images[0]} alt={product.name} fill className="object-contain" sizes="80px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center"><Heart size={24} className="text-gray-300" /></div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/products/${product.slug}`} className="text-sm font-semibold text-text-primary hover:text-primary-600 transition-colors line-clamp-2">
                  {product.name}
                </Link>
                {product.brand && <p className="text-xs text-text-muted mt-0.5">{product.brand}</p>}
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-sm font-bold text-text-primary">{formatCurrency(product.price)}</span>
                  {product.compareAtPrice > product.price && (
                    <span className="text-xs text-text-muted line-through">{formatCurrency(product.compareAtPrice)}</span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${product.stock > 0 ? "text-success-600" : "text-danger-600"}`}>
                  {product.stock > 0 ? "In Stock" : "Out of Stock"}
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => handleMoveToCart(product)}
                  disabled={product.stock <= 0 || movingToCart.has(product.id)}
                  className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {movingToCart.has(product.id) ? <Loader2 size={12} className="animate-spin" /> : <ShoppingCart size={12} />}
                  Move to Cart
                </button>
                <button
                  onClick={() => handleRemove(product.id)}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-text-secondary hover:bg-gray-50 transition-colors"
                >
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
