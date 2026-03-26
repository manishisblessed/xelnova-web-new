"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { useProducts } from "@/lib/api";
import { ProductCard } from "@/components/marketplace/product-card";

export default function WishlistPage() {
  const [mounted, setMounted] = useState(false);
  const wishlistItems = useWishlistStore((s) => s.items);
  useEffect(() => setMounted(true), []);

  const { data: productsData } = useProducts({ limit: 100 });
  const allProducts = productsData?.products || [];

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const wishlistProducts = allProducts.filter((p) => wishlistItems.includes(p.id));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">
          My Wishlist ({wishlistProducts.length})
        </h2>
      </div>

      {wishlistProducts.length === 0 ? (
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
          {wishlistProducts.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
