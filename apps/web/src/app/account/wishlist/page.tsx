"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { products } from "@/lib/data";
import { ProductCard } from "@/components/marketplace/product-card";

export default function WishlistPage() {
  const [mounted, setMounted] = useState(false);
  const wishlistItems = useWishlistStore((s) => s.items);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="flex min-h-screen items-center justify-center bg-surface-950"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-400 border-t-transparent" /></div>;

  const wishlistProducts = products.filter((p) => wishlistItems.includes(p.id));

  return (
    <div className="min-h-screen bg-surface-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-white mb-8 font-display">My Wishlist ({wishlistProducts.length})</h1>
        {wishlistProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <div className="rounded-full bg-surface-800 p-6 mb-4 border border-surface-300/30"><Heart size={40} className="text-surface-200" /></div>
              <h3 className="text-lg font-semibold text-white">Your wishlist is empty</h3>
              <p className="mt-1 text-sm text-surface-100">Save items you love to buy them later.</p>
              <Link href="/products" className="mt-4 inline-block rounded-xl bg-gold-400 px-6 py-2.5 text-sm font-semibold text-surface-950 hover:bg-gold-300">Browse Products</Link>
            </motion.div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:gap-5">
            {wishlistProducts.map((product, i) => (<ProductCard key={product.id} product={product} index={i} />))}
          </div>
        )}
      </div>
    </div>
  );
}
