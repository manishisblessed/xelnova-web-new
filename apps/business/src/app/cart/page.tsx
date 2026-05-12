"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Tag, ShieldCheck, Truck, Heart, RefreshCw, ChevronDown, X, Ticket } from "lucide-react";
import { formatCurrency, priceInclusiveOfGst } from "@xelnova/utils";
import { useAuth, cartApi, productsApi } from "@xelnova/api";
import { useCartStore, type CartItem } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";

interface AvailableCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  validUntil: string | null;
}

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

function totalCouponDiscount(items: CartItem[]): number {
  return items.reduce(
    (sum, item) =>
      sum + (item.appliedCoupon?.discountAmount ?? 0) * item.quantity,
    0,
  );
}

function computeCouponDiscount(
  coupon: AvailableCoupon,
  itemPriceIncl: number,
): number {
  if (coupon.minOrderAmount > 0 && itemPriceIncl < coupon.minOrderAmount) return 0;
  if (coupon.discountType === "PERCENTAGE") {
    const disc = Math.round(itemPriceIncl * coupon.discountValue / 100);
    return coupon.maxDiscount && disc > coupon.maxDiscount ? coupon.maxDiscount : disc;
  }
  return Math.min(coupon.discountValue, itemPriceIncl);
}

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const [shippingConfig, setShippingConfig] = useState<{ freeShippingMin: number; defaultRate: number }>({ freeShippingMin: 499, defaultRate: 49 });

  const [couponsByProduct, setCouponsByProduct] = useState<Record<string, AvailableCoupon[]>>({});

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    cartApi.getShippingConfig().then(setShippingConfig).catch(() => {});
  }, []);

  const productSlugs = useMemo(
    () => [...new Set(items.map((i) => i.slug).filter(Boolean))],
    [items],
  );

  useEffect(() => {
    if (!mounted || productSlugs.length === 0) return;
    let cancelled = false;
    (async () => {
      const results: Record<string, AvailableCoupon[]> = {};
      await Promise.all(
        productSlugs.map(async (slug) => {
          try {
            const data = await productsApi.getProductBySlug(slug);
            if (data?.availableCoupons?.length) {
              const productId = items.find((i) => i.slug === slug)?.productId;
              if (productId) results[productId] = data.availableCoupons;
            }
          } catch { /* ignore */ }
        }),
      );
      if (!cancelled) setCouponsByProduct(results);
    })();
    return () => { cancelled = true; };
  }, [mounted, productSlugs, items]);

  const handleToggleCoupon = useCallback(
    (item: CartItem, coupon: AvailableCoupon) => {
      const isApplied = item.appliedCoupon?.code === coupon.code;
      const priceIncl = priceInclusiveOfGst(item.price, item.gstRate ?? null);
      const discountAmount = isApplied ? 0 : computeCouponDiscount(coupon, priceIncl);

      const updatedItem: Omit<CartItem, "quantity"> = {
        id: item.id,
        productId: item.productId,
        name: item.name,
        slug: item.slug,
        price: item.price,
        comparePrice: item.comparePrice,
        image: item.image,
        variant: item.variant,
        seller: item.seller,
        gstRate: item.gstRate,
        appliedCoupon: isApplied
          ? null
          : {
              code: coupon.code,
              discountType: coupon.discountType,
              discountValue: coupon.discountValue,
              discountAmount,
            },
      };

      useCartStore.setState((state) => ({
        items: state.items.map((i) =>
          i.id === item.id ? { ...updatedItem, quantity: i.quantity } : i,
        ),
      }));
    },
    [],
  );

  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);

  const handleApplyCouponCode = useCallback(() => {
    const code = couponCode.trim().toUpperCase();
    if (!code) { setCouponError("Please enter a coupon code"); return; }
    setCouponError("");
    setCouponSuccess("");

    let appliedCount = 0;
    const currentItems = useCartStore.getState().items;

    for (const item of currentItems) {
      const coupons = couponsByProduct[item.productId] ?? [];
      const match = coupons.find((c) => c.code.toUpperCase() === code);
      if (!match) continue;

      const priceIncl = priceInclusiveOfGst(item.price, item.gstRate ?? null);
      const discountAmount = computeCouponDiscount(match, priceIncl);
      if (discountAmount <= 0) continue;

      if (item.appliedCoupon?.code === match.code) {
        appliedCount++;
        continue;
      }

      useCartStore.setState((state) => ({
        items: state.items.map((i) =>
          i.id === item.id
            ? {
                ...i,
                appliedCoupon: {
                  code: match.code,
                  discountType: match.discountType,
                  discountValue: match.discountValue,
                  discountAmount,
                },
              }
            : i,
        ),
      }));
      appliedCount++;
    }

    if (appliedCount > 0) {
      setCouponSuccess(`Coupon ${code} applied to ${appliedCount} item${appliedCount > 1 ? "s" : ""}!`);
      setCouponCode("");
    } else {
      setCouponError("Invalid coupon or not applicable to items in your cart");
    }
  }, [couponCode, couponsByProduct]);

  const handleRemoveAllCoupons = useCallback(() => {
    useCartStore.setState((state) => ({
      items: state.items.map((i) => ({ ...i, appliedCoupon: null })),
    }));
    setCouponSuccess("");
    setCouponCode("");
  }, []);

  const priceTotal = useMemo(() => inclusiveTotal(items), [items]);
  const compareTotal = useMemo(() => inclusiveCompareTotal(items), [items]);
  const savings = useMemo(() => Math.max(0, compareTotal - priceTotal), [compareTotal, priceTotal]);
  const couponSavings = useMemo(() => totalCouponDiscount(items), [items]);
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const shippingCharge = useMemo(() => priceTotal >= shippingConfig.freeShippingMin ? 0 : shippingConfig.defaultRate, [priceTotal, shippingConfig.freeShippingMin, shippingConfig.defaultRate]);
  const orderTotal = useMemo(() => priceTotal - couponSavings + shippingCharge, [priceTotal, couponSavings, shippingCharge]);
  const totalSaved = useMemo(() => savings + couponSavings, [savings, couponSavings]);

  const appliedCouponCodes = useMemo(
    () => [...new Set(items.map((i) => i.appliedCoupon?.code).filter(Boolean))] as string[],
    [items],
  );

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
                <CartItemCard
                  key={item.id}
                  item={item}
                  availableCoupons={couponsByProduct[item.productId] ?? []}
                  onRemove={removeItem}
                  onUpdateQty={updateQuantity}
                  onSaveForLater={(id, productId) => { toggleWishlist(productId); removeItem(id); }}
                  onToggleCoupon={handleToggleCoupon}
                />
              ))}
            </AnimatePresence>
          </div>
          <div className="lg:col-span-1">
            <div className="sticky top-28 rounded-2xl border border-border bg-white p-6 shadow-card">
              <h2 className="mb-4 text-lg font-bold text-text-primary">Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-text-secondary"><span>Price ({itemCount} {itemCount === 1 ? "item" : "items"})</span><span className="font-medium text-text-primary">{formatCurrency(compareTotal)}</span></div>
                {savings > 0 && (<div className="flex justify-between text-success-600"><span className="flex items-center gap-1"><Tag size={14} />Discount</span><span className="font-medium">-{formatCurrency(savings)}</span></div>)}
                {couponSavings > 0 && (<div className="flex justify-between text-emerald-600"><span className="flex items-center gap-1"><Tag size={14} />Coupon Discount</span><span className="font-medium">-{formatCurrency(couponSavings)}</span></div>)}
                <div className="flex justify-between text-text-secondary"><span>Delivery</span><span className={priceTotal >= shippingConfig.freeShippingMin ? "font-semibold text-success-600" : "font-medium text-text-primary"}>{priceTotal >= shippingConfig.freeShippingMin ? "FREE" : formatCurrency(shippingConfig.defaultRate)}</span></div>
                <hr className="border-border-light" />
                <div className="flex justify-between text-lg font-bold text-text-primary"><span>Total</span><span>{formatCurrency(orderTotal)}</span></div>
                <p className="text-[11px] text-text-muted">Inclusive of all taxes</p>
                {totalSaved > 0 && (<p className="rounded-xl bg-success-50 border border-success-100 px-3 py-2 text-center text-sm font-medium text-success-700">You save {formatCurrency(totalSaved)} on this order</p>)}
              </div>

              {/* Apply Coupon Section */}
              <div className="mt-4 border-t border-border-light pt-4">
                {appliedCouponCodes.length > 0 ? (
                  <div className="space-y-2">
                    {appliedCouponCodes.map((code) => (
                      <div key={code} className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Ticket size={14} className="text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-700">{code}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            useCartStore.setState((state) => ({
                              items: state.items.map((i) =>
                                i.appliedCoupon?.code === code ? { ...i, appliedCoupon: null } : i,
                              ),
                            }));
                            setCouponSuccess("");
                          }}
                          className="text-emerald-600 hover:text-emerald-800 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => setCouponOpen(!couponOpen)}
                  className="flex w-full items-center justify-between py-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors mt-1"
                >
                  <span className="flex items-center gap-1.5">
                    <Ticket size={14} />
                    {appliedCouponCodes.length > 0 ? "Apply another coupon" : "Have a coupon code?"}
                  </span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${couponOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {couponOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                          onKeyDown={(e) => e.key === "Enter" && handleApplyCouponCode()}
                          placeholder="Enter coupon code"
                          className="flex-1 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCouponCode}
                          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors whitespace-nowrap"
                        >
                          Apply
                        </button>
                      </div>
                      {couponError && (
                        <p className="mt-1.5 text-xs text-danger-600">{couponError}</p>
                      )}
                      {couponSuccess && (
                        <p className="mt-1.5 text-xs text-success-600">{couponSuccess}</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button onClick={handleCheckout} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-sm font-bold text-white shadow-primary hover:bg-primary-700 transition-all cursor-pointer">
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

function CartItemCard({
  item,
  availableCoupons,
  onRemove,
  onUpdateQty,
  onSaveForLater,
  onToggleCoupon,
}: {
  item: CartItem;
  availableCoupons: AvailableCoupon[];
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onSaveForLater: (id: string, productId: string) => void;
  onToggleCoupon: (item: CartItem, coupon: AvailableCoupon) => void;
}) {
  const priceIncl = priceInclusiveOfGst(item.price, item.gstRate ?? null);
  const compareIncl = priceInclusiveOfGst(Math.max(item.price, item.comparePrice), item.gstRate ?? null);
  const couponDiscount = item.appliedCoupon?.discountAmount ?? 0;
  const finalPrice = priceIncl - couponDiscount;
  const subtotal = finalPrice * item.quantity;

  const couponsToShow = availableCoupons.filter(
    (c) => !item.appliedCoupon || item.appliedCoupon.code === c.code,
  );

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100, height: 0, marginBottom: 0, padding: 0 }} transition={{ duration: 0.3 }} className="rounded-2xl border border-border bg-white p-4 shadow-card sm:p-5">
      <div className="flex gap-4">
        <Link href={`/products/${item.slug || '#'}`} className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-border-light bg-surface-muted sm:h-32 sm:w-32">
          {item.image ? (
            <Image src={item.image} alt={item.name} fill sizes="128px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center"><ShoppingBag size={24} className="text-text-muted" /></div>
          )}
        </Link>
        <div className="flex flex-1 flex-col">
          <Link href={`/products/${item.slug}`} className="text-sm font-medium text-text-primary hover:text-primary-600 transition-colors line-clamp-2 sm:text-base">{item.name}</Link>
          <p className="mt-0.5 text-xs text-text-muted">Sold by {item.seller}</p>
          {item.variant && item.variant !== '__default__' && <p className="mt-0.5 text-xs text-text-muted">Variant: {item.variant}</p>}
          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-bold text-text-primary">{formatCurrency(couponDiscount > 0 ? finalPrice : priceIncl)}</span>
            {couponDiscount > 0 && <span className="text-sm text-text-muted line-through">{formatCurrency(priceIncl)}</span>}
            {compareIncl > priceIncl && <span className="text-sm text-text-muted line-through">{formatCurrency(compareIncl)}</span>}
          </div>

          {/* Coupon checkboxes - same style as product page */}
          {couponsToShow.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {couponsToShow.slice(0, 2).map((coupon) => {
                const discountText = coupon.discountType === "PERCENTAGE"
                  ? `${coupon.discountValue}% off`
                  : `₹${coupon.discountValue} off`;
                const isSelected = item.appliedCoupon?.code === coupon.code;
                return (
                  <div key={coupon.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`cart-coupon-${item.id}-${coupon.id}`}
                      checked={isSelected}
                      onChange={() => onToggleCoupon(item, coupon)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label
                      htmlFor={`cart-coupon-${item.id}-${coupon.id}`}
                      className="flex items-center gap-1.5 text-sm cursor-pointer"
                    >
                      <span className="text-text-primary">Apply</span>
                      <span className="font-semibold text-emerald-700">{discountText} coupon</span>
                      <span className="text-text-muted">({coupon.code})</span>
                    </label>
                  </div>
                );
              })}
              {!item.appliedCoupon && availableCoupons.length > 2 && (
                <p className="text-xs text-primary-600 font-medium ml-6">
                  +{availableCoupons.length - 2} more coupon{availableCoupons.length - 2 > 1 ? "s" : ""} available
                </p>
              )}
            </div>
          )}

          {item.appliedCoupon && !couponsToShow.some((c) => c.code === item.appliedCoupon?.code) && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1 w-fit">
              <Tag size={12} className="text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700">
                {item.appliedCoupon.code} applied (-{formatCurrency(couponDiscount)})
              </span>
            </div>
          )}

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
          <div className="mt-2 text-right"><span className="text-sm font-semibold text-text-primary">Subtotal: {formatCurrency(subtotal)}</span></div>
        </div>
      </div>
    </motion.div>
  );
}
