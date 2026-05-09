"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Tag, ShieldCheck, Truck, Heart, RefreshCw } from "lucide-react";
import { formatCurrency, priceInclusiveOfGst } from "@xelnova/utils";
import { useAuth, cartApi } from "@xelnova/api";
import { useCartStore, type CartItem } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";

function inclusiveTotal(items: CartItem[]): number {
  return items.reduce(
    (sum, item) =>
      sum + priceInclusiveOfGst(item.price, item.gstRate ?? null) * item.quantity,
    0,
  );
}

function inclusiveCompareTotal(items: CartItem[]): number {
  return items.reduce(
    (sum, item) =>
      sum +
      priceInclusiveOfGst(Math.max(item.price, item.comparePrice), item.gstRate ?? null) *
        item.quantity,
    0,
  );
}

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const totalItems = useCartStore((s) => s.totalItems);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const [shippingConfig, setShippingConfig] = useState<{ freeShippingMin: number; defaultRate: number }>({ freeShippingMin: 499, defaultRate: 49 });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    cartApi.getShippingConfig().then(setShippingConfig).catch(() => {});
  }, []);

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

  // Cart shows the same tax-inclusive price the user saw on the product card / PDP.
  const priceTotal = inclusiveTotal(items);
  const compareTotal = inclusiveCompareTotal(items);
  const savings = Math.max(0, compareTotal - priceTotal);
  const itemCount = totalItems();
  const shippingCharge = priceTotal >= shippingConfig.freeShippingMin ? 0 : shippingConfig.defaultRate;
  const orderTotal = priceTotal + shippingCharge;

  return (
    <div className="min-h-screen bg-surface-raised">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-text-primary font-display sm:text-2xl">Shopping Cart ({itemCount} {itemCount === 1 ? "item" : "items"})</h1>
          <button type="button" onClick={clearCart} className="self-start text-sm font-medium text-danger-600 transition-colors hover:text-danger-700 sm:self-auto">Clear Cart</button>
        </div>
        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="space-y-4 lg:col-span-2">
            <AnimatePresence>
              {items.map((item) => (
                <CartItemCard key={item.id} item={item} onRemove={removeItem} onUpdateQty={updateQuantity} onSaveForLater={(id, productId) => { toggleWishlist(productId); removeItem(id); }} />
              ))}
            </AnimatePresence>
          </div>
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6 lg:sticky lg:top-24 xl:top-28">
              <h2 className="mb-4 text-lg font-bold text-text-primary">Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-text-secondary"><span>Price ({itemCount} {itemCount === 1 ? "item" : "items"})</span><span className="font-medium text-text-primary">{formatCurrency(compareTotal)}</span></div>
                {savings > 0 && (<div className="flex justify-between text-success-600"><span className="flex items-center gap-1"><Tag size={14} />Discount</span><span className="font-medium">-{formatCurrency(savings)}</span></div>)}
                <div className="flex justify-between text-text-secondary"><span>Delivery</span><span className={priceTotal >= shippingConfig.freeShippingMin ? "font-semibold text-success-600" : "font-medium text-text-primary"}>{priceTotal >= shippingConfig.freeShippingMin ? "FREE" : formatCurrency(shippingConfig.defaultRate)}</span></div>
                <hr className="border-border-light" />
                <div className="flex justify-between text-lg font-bold text-text-primary">
                  <span>Total</span>
                  <span>{formatCurrency(orderTotal)}</span>
                </div>
                <p className="text-[11px] text-text-muted">Inclusive of all taxes</p>
                {savings > 0 && (<p className="rounded-xl bg-success-50 border border-success-100 px-3 py-2 text-center text-sm font-medium text-success-700">You save {formatCurrency(savings)} on this order</p>)}
              </div>
              <button type="button" onClick={handleCheckout} className="mt-6 flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-sm font-bold text-white shadow-primary transition-all hover:bg-primary-700">
                Proceed to Checkout <ArrowRight size={16} />
              </button>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <TrustBadge icon={<ShieldCheck size={18} className="text-success-600" />} title="Secure" subtitle="100% safe payments" />
                <TrustBadge icon={<Truck size={18} className="text-primary-600" />} title="Free shipping" subtitle="On every order" />
                <TrustBadge icon={<RefreshCw size={18} className="text-accent-600" />} title="Easy returns" subtitle="7-day window" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustBadge({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border-light bg-surface-raised px-2 py-3 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">{icon}</div>
      <p className="text-[11px] font-semibold text-text-primary leading-tight">{title}</p>
      <p className="text-[10px] text-text-muted leading-tight">{subtitle}</p>
    </div>
  );
}

function CartItemCard({ item, onRemove, onUpdateQty, onSaveForLater }: { item: CartItem; onRemove: (id: string) => void; onUpdateQty: (id: string, qty: number) => void; onSaveForLater: (id: string, productId: string) => void; }) {
  const priceIncl = priceInclusiveOfGst(item.price, item.gstRate ?? null);
  const compareIncl = priceInclusiveOfGst(Math.max(item.price, item.comparePrice), item.gstRate ?? null);
  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100, height: 0, marginBottom: 0, padding: 0 }} transition={{ duration: 0.3 }} className="rounded-2xl border border-border bg-white p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link href={`/products/${item.slug || '#'}`} className="relative mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-border-light bg-surface-muted sm:mx-0 sm:h-32 sm:w-32">
          {item.image ? (
            <Image src={item.image} alt={item.name} fill sizes="128px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center"><ShoppingBag size={24} className="text-text-muted" /></div>
          )}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <Link href={`/products/${item.slug}`} className="break-words text-sm font-medium text-text-primary transition-colors hover:text-primary-600 line-clamp-3 sm:line-clamp-2 sm:text-base">{item.name}</Link>
          <p className="mt-0.5 text-xs text-text-muted">Sold by {item.seller}</p>
          {item.variant && <p className="mt-0.5 text-xs text-text-muted">Variant: {item.variant}</p>}
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-text-primary">{formatCurrency(priceIncl)}</span>
            {compareIncl > priceIncl && <span className="text-sm text-text-muted line-through">{formatCurrency(compareIncl)}</span>}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center rounded-lg border border-gray-200">
              <button type="button" onClick={() => onUpdateQty(item.id, item.quantity - 1)} className="rounded-l-lg px-2.5 py-1.5 text-text-secondary transition-colors hover:bg-gray-50 hover:text-text-primary"><Minus size={14} /></button>
              <span className="min-w-[32px] border-x border-gray-200 text-center text-sm font-semibold text-text-primary py-1.5">{item.quantity}</span>
              <button type="button" onClick={() => onUpdateQty(item.id, Math.min(50, item.quantity + 1))} className="rounded-r-lg px-2.5 py-1.5 text-text-secondary transition-colors hover:bg-gray-50 hover:text-text-primary"><Plus size={14} /></button>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => onSaveForLater(item.id, item.productId)} className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-primary-600 transition-colors"><Heart size={14} /><span className="hidden sm:inline">Save</span></button>
              <button onClick={() => onRemove(item.id)} className="flex items-center gap-1 text-xs font-medium text-danger-600 hover:text-danger-700 transition-colors"><Trash2 size={14} /><span className="hidden sm:inline">Remove</span></button>
            </div>
          </div>
          <div className="mt-2 text-right"><span className="text-sm font-semibold text-text-primary">Subtotal: {formatCurrency(priceIncl * item.quantity)}</span></div>
        </div>
      </div>
    </motion.div>
  );
}
