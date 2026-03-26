"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Tag, ShieldCheck, Truck, Heart } from "lucide-react";
import { formatCurrency } from "@xelnova/utils";
import { useAuth } from "@xelnova/api";
import { useCartStore, type CartItem } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const totalItems = useCartStore((s) => s.totalItems);
  const totalSavings = useCartStore((s) => s.totalSavings);
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  useEffect(() => setMounted(true), []);

  const handleCheckout = () => {
    if (isAuthenticated) {
      router.push("/checkout");
    } else {
      router.push("/login?redirect=/checkout");
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-raised">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-surface-raised px-4 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}>
          <div className="mb-6 inline-flex rounded-full bg-primary-50 p-8 border border-primary-100">
            <ShoppingBag size={56} className="text-primary-300" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Your cart is empty</h1>
          <p className="mt-2 text-text-secondary">Looks like you haven&apos;t added anything yet.</p>
          <Link href="/products" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-8 py-3 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-primary">
            Continue Shopping <ArrowRight size={16} />
          </Link>
        </motion.div>
      </div>
    );
  }

  const priceTotal = totalPrice();
  const savings = totalSavings();
  const itemCount = totalItems();

  return (
    <div className="min-h-screen bg-surface-raised">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary font-display">Shopping Cart ({itemCount} {itemCount === 1 ? "item" : "items"})</h1>
          <button onClick={clearCart} className="text-sm font-medium text-danger-600 hover:text-danger-700 transition-colors">Clear Cart</button>
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {items.map((item) => (
                <CartItemCard key={item.id} item={item} onRemove={removeItem} onUpdateQty={updateQuantity} onSaveForLater={(id, productId) => { toggleWishlist(productId); removeItem(id); }} />
              ))}
            </AnimatePresence>
          </div>
          <div className="lg:col-span-1">
            <div className="sticky top-28 rounded-2xl border border-border bg-white p-6 shadow-card">
              <h2 className="mb-4 text-lg font-bold text-text-primary">Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-text-secondary"><span>Subtotal ({itemCount} items)</span><span className="font-medium text-text-primary">{formatCurrency(priceTotal + savings)}</span></div>
                {savings > 0 && (<div className="flex justify-between text-success-600"><span className="flex items-center gap-1"><Tag size={14} />Discount</span><span className="font-medium">-{formatCurrency(savings)}</span></div>)}
                <div className="flex justify-between text-text-secondary"><span>Delivery</span><span className="font-semibold text-success-600">FREE</span></div>
                <hr className="border-border-light" />
                <div className="flex justify-between text-lg font-bold text-text-primary"><span>Total</span><span>{formatCurrency(priceTotal)}</span></div>
                {savings > 0 && (<p className="rounded-xl bg-success-50 border border-success-100 px-3 py-2 text-center text-sm font-medium text-success-700">You save {formatCurrency(savings)} on this order</p>)}
              </div>
              <button onClick={handleCheckout} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-sm font-bold text-white shadow-primary hover:bg-primary-700 transition-all cursor-pointer">
                Proceed to Checkout <ArrowRight size={16} />
              </button>
              <div className="mt-5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-text-secondary"><ShieldCheck size={14} className="text-success-600" /><span>Safe and Secure Payments</span></div>
                <div className="flex items-center gap-2 text-xs text-text-secondary"><Truck size={14} className="text-primary-600" /><span>Free delivery on all orders</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartItemCard({ item, onRemove, onUpdateQty, onSaveForLater }: { item: CartItem; onRemove: (id: string) => void; onUpdateQty: (id: string, qty: number) => void; onSaveForLater: (id: string, productId: string) => void; }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100, height: 0, marginBottom: 0, padding: 0 }} transition={{ duration: 0.3 }} className="rounded-2xl border border-border bg-white p-4 shadow-card sm:p-5">
      <div className="flex gap-4">
        <Link href={`/products/${item.slug}`} className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-border-light bg-surface-muted sm:h-32 sm:w-32">
          <Image src={item.image} alt={item.name} fill sizes="128px" className="object-cover" />
        </Link>
        <div className="flex flex-1 flex-col">
          <Link href={`/products/${item.slug}`} className="text-sm font-medium text-text-primary hover:text-primary-600 transition-colors line-clamp-2 sm:text-base">{item.name}</Link>
          <p className="mt-0.5 text-xs text-text-muted">Sold by {item.seller}</p>
          {item.variant && <p className="mt-0.5 text-xs text-text-muted">Variant: {item.variant}</p>}
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-text-primary">{formatCurrency(item.price)}</span>
            {item.comparePrice > item.price && <span className="text-sm text-text-muted line-through">{formatCurrency(item.comparePrice)}</span>}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center rounded-lg border border-gray-200">
              <button onClick={() => onUpdateQty(item.id, item.quantity - 1)} className="px-2.5 py-1.5 text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors rounded-l-lg"><Minus size={14} /></button>
              <span className="min-w-[32px] border-x border-gray-200 text-center text-sm font-semibold text-text-primary py-1.5">{item.quantity}</span>
              <button onClick={() => onUpdateQty(item.id, Math.min(10, item.quantity + 1))} className="px-2.5 py-1.5 text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-colors rounded-r-lg"><Plus size={14} /></button>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => onSaveForLater(item.id, item.productId)} className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-primary-600 transition-colors"><Heart size={14} /><span className="hidden sm:inline">Save</span></button>
              <button onClick={() => onRemove(item.id)} className="flex items-center gap-1 text-xs font-medium text-danger-600 hover:text-danger-700 transition-colors"><Trash2 size={14} /><span className="hidden sm:inline">Remove</span></button>
            </div>
          </div>
          <div className="mt-2 text-right"><span className="text-sm font-semibold text-text-primary">Subtotal: {formatCurrency(item.price * item.quantity)}</span></div>
        </div>
      </div>
    </motion.div>
  );
}
