"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, CreditCard, Check, Plus, ChevronRight,
  ShieldCheck, Truck, ArrowLeft, X, Loader2,
} from "lucide-react";
import { cn } from "@xelnova/utils";
import { formatCurrency } from "@xelnova/utils";
import { useAuth, ordersApi, usersApi, paymentApi, setAccessToken } from "@xelnova/api";
import { useCartStore } from "@/lib/store/cart-store";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: () => void) => void };
  }
}

function hasAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return /(?:^|;\s*)xelnova-token=/.test(document.cookie);
}

type Step = "address" | "review";

interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  type: string;
  isDefault: boolean;
}

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: "address", label: "Address", icon: MapPin },
  { id: "review", label: "Review & Pay", icon: CreditCard },
];

const EMPTY_FORM = { name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "", type: "HOME" };

export default function CheckoutPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("address");
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [showNewAddress, setShowNewAddress] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<typeof EMPTY_FORM>>({});
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const totalSavings = useCartStore((s) => s.totalSavings);
  const totalItems = useCartStore((s) => s.totalItems);
  const clearCart = useCartStore((s) => s.clearCart);

  const razorpayLoaded = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated && !hasAuthCookie()) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setAuthChecked(true);

    const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
    if (m) setAccessToken(decodeURIComponent(m[1]));

    usersApi.getAddresses().then((saved) => {
      if (saved && saved.length > 0) {
        const mapped: SavedAddress[] = saved.map((a) => ({
          id: a.id,
          name: a.fullName,
          phone: a.phone,
          line1: a.addressLine1,
          line2: a.addressLine2 || "",
          city: a.city,
          state: a.state,
          pincode: a.pincode,
          type: a.type,
          isDefault: a.isDefault,
        }));
        setAddresses(mapped);
        const def = mapped.find((a) => a.isDefault) || mapped[0];
        setSelectedAddress(def.id);
        setShowNewAddress(false);
      }
    }).catch(() => {});
  }, [authLoading, isAuthenticated, router, pathname]);

  useEffect(() => {
    if (razorpayLoaded.current || typeof window === "undefined") return;
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      razorpayLoaded.current = true;
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => { razorpayLoaded.current = true; };
    document.head.appendChild(script);
  }, []);

  const syncToken = useCallback(() => {
    const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
    if (m) setAccessToken(decodeURIComponent(m[1]));
  }, []);

  const openRazorpay = useCallback((paymentOrder: {
    razorpayOrderId: string;
    amount: number;
    currency: string;
    keyId: string;
    orderId: string;
  }, dbOrderNumber: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!window.Razorpay) {
        reject(new Error("Payment gateway is loading. Please try again."));
        return;
      }

      const addr = addresses.find((a) => a.id === selectedAddress);
      const options: Record<string, unknown> = {
        key: paymentOrder.keyId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: "Xelnova",
        description: `Order #${dbOrderNumber}`,
        order_id: paymentOrder.razorpayOrderId,
        prefill: {
          name: addr?.name || "",
          contact: addr?.phone || "",
        },
        theme: { color: "#10b981" },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            syncToken();
            await paymentApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            resolve();
          } catch {
            reject(new Error("Payment verification failed. If money was deducted, it will be refunded within 5-7 days."));
          }
        },
        modal: {
          ondismiss: () => {
            reject(new Error("Payment was cancelled. Your order has been saved — you can retry payment from your orders page."));
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        reject(new Error("Payment failed. Please try again or choose a different payment method."));
      });
      rzp.open();
    });
  }, [addresses, selectedAddress, syncToken]);

  if (!mounted || !authChecked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <p className="text-sm text-text-muted">Loading checkout…</p>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary-50 via-white to-success-50">
        {/* Animated confetti particles */}
        <div className="pointer-events-none absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                y: -20, 
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                rotate: 0,
                opacity: 1 
              }}
              animate={{ 
                y: typeof window !== 'undefined' ? window.innerHeight + 100 : 1000,
                rotate: Math.random() * 720 - 360,
                opacity: [1, 1, 0]
              }}
              transition={{ 
                duration: Math.random() * 3 + 2,
                delay: Math.random() * 0.5,
                ease: "linear",
                repeat: Infinity,
                repeatDelay: Math.random() * 2
              }}
              className="absolute h-3 w-3 rounded-sm"
              style={{
                backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'][Math.floor(Math.random() * 6)],
                left: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        {/* Decorative circles */}
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-success-500"
        />
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-primary-500"
        />

        <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
          {/* Success icon with rings */}
          <div className="relative mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.6, times: [0, 0.6, 1] }}
              className="absolute inset-0 rounded-full bg-success-200/50"
              style={{ transform: 'scale(1.8)' }}
            />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.6, delay: 0.1, times: [0, 0.6, 1] }}
              className="absolute inset-0 rounded-full bg-success-300/40"
              style={{ transform: 'scale(1.4)' }}
            />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
              className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-success-400 to-success-600 shadow-lg shadow-success-500/30"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 10, stiffness: 150, delay: 0.4 }}
              >
                <Check size={56} className="text-white" strokeWidth={3} />
              </motion.div>
            </motion.div>
          </div>

          {/* Content card */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="w-full max-w-md rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl shadow-gray-200/50 border border-white/50"
          >
            <div className="text-center">
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-3xl font-bold bg-gradient-to-r from-success-600 to-primary-600 bg-clip-text text-transparent font-display"
              >
                Order Confirmed!
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mt-3 text-text-secondary"
              >
                Thank you for your purchase! We&apos;re preparing your order with care.
              </motion.p>
              
              {orderNumber && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-success-50 px-5 py-2.5 border border-primary-100"
                >
                  <span className="text-sm text-text-secondary">Order ID:</span>
                  <span className="font-mono font-bold text-primary-700">#{orderNumber}</span>
                </motion.div>
              )}

              {/* Timeline preview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="mt-8 flex justify-center gap-2"
              >
                {[
                  { icon: Check, label: 'Confirmed', active: true },
                  { icon: Truck, label: 'Shipping', active: false },
                  { icon: MapPin, label: 'Delivered', active: false },
                ].map((step, i) => (
                  <div key={i} className="flex items-center">
                    <div className={cn(
                      "flex flex-col items-center",
                      step.active ? "text-success-600" : "text-gray-300"
                    )}>
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border-2",
                        step.active 
                          ? "border-success-500 bg-success-50" 
                          : "border-gray-200 bg-gray-50"
                      )}>
                        <step.icon size={18} />
                      </div>
                      <span className={cn(
                        "mt-1.5 text-xs font-medium",
                        step.active ? "text-success-700" : "text-gray-400"
                      )}>
                        {step.label}
                      </span>
                    </div>
                    {i < 2 && (
                      <div className={cn(
                        "mx-1 h-0.5 w-8 rounded",
                        i === 0 ? "bg-gradient-to-r from-success-400 to-gray-200" : "bg-gray-200"
                      )} />
                    )}
                  </div>
                ))}
              </motion.div>

              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="mt-8 flex flex-col gap-3"
              >
                <Link 
                  href="/account/orders" 
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition-all hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Truck size={18} />
                    Track Your Order
                    <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-700 to-primary-800 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
                <Link 
                  href="/products" 
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 px-6 py-4 text-sm font-semibold text-text-primary transition-all hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                >
                  Continue Shopping
                  <ArrowLeft size={16} className="rotate-180" />
                </Link>
              </motion.div>

              {/* Additional info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="mt-8 flex items-center justify-center gap-4 text-xs text-text-muted"
              >
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-success-500" />
                  <span>Secure Payment</span>
                </div>
                <span className="h-3 w-px bg-gray-200" />
                <div className="flex items-center gap-1.5">
                  <Truck size={14} className="text-primary-500" />
                  <span>Fast Delivery</span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Celebration message */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-6 text-sm text-text-muted"
          >
            A confirmation email has been sent to your registered email address.
          </motion.p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold text-text-primary">No items in cart</h1>
        <p className="mt-2 text-text-secondary">Add some items to proceed with checkout.</p>
        <Link href="/products" className="mt-6 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700 transition-colors">Browse Products</Link>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const priceTotal = totalPrice();
  const savings = totalSavings();
  const itemCount = totalItems();

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const errs: Partial<typeof EMPTY_FORM> = {};
    if (!form.name.trim()) errs.name = "Required";
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10) errs.phone = "Valid phone required";
    if (!form.line1.trim()) errs.line1 = "Required";
    if (!form.city.trim()) errs.city = "Required";
    if (!form.state.trim()) errs.state = "Required";
    if (!form.pincode.trim() || form.pincode.replace(/\D/g, "").length < 6) errs.pincode = "Valid PIN required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveAddress = async () => {
    if (!validateForm()) return;

    const localAddr: SavedAddress = {
      id: `addr-${Date.now()}`,
      name: form.name.trim(),
      phone: form.phone.trim(),
      line1: form.line1.trim(),
      line2: form.line2.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      type: form.type,
      isDefault: addresses.length === 0,
    };

    setAddresses((prev) => [...prev, localAddr]);
    setSelectedAddress(localAddr.id);
    setShowNewAddress(false);
    setForm(EMPTY_FORM);
    setFormErrors({});

    try {
      const saved = await usersApi.addAddress({
        fullName: localAddr.name,
        phone: localAddr.phone,
        addressLine1: localAddr.line1,
        addressLine2: localAddr.line2 || null,
        city: localAddr.city,
        state: localAddr.state,
        pincode: localAddr.pincode,
        landmark: null,
        type: localAddr.type,
      });
      if (saved?.id) {
        setAddresses((prev) =>
          prev.map((a) => (a.id === localAddr.id ? { ...a, id: saved.id } : a))
        );
        setSelectedAddress(saved.id);
      }
    } catch {
      // Address still usable locally even if backend save fails
    }
  };

  const canProceed = () => {
    if (currentStep === "address") return !!selectedAddress;
    return !placingOrder;
  };

  const placeOrder = async () => {
    const addr = addresses.find((a) => a.id === selectedAddress);
    if (!addr || items.length === 0) return;

    setPlacingOrder(true);
    setOrderError("");
    syncToken();

    try {
      const order = await ordersApi.createOrder({
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          variant: item.variant || undefined,
        })),
        shippingAddress: {
          fullName: addr.name,
          phone: addr.phone,
          addressLine1: addr.line1,
          addressLine2: addr.line2 || undefined,
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          type: addr.type,
        },
        paymentMethod: "razorpay",
      });

      if (!order?.id) {
        throw new Error("Order creation failed. Please try again.");
      }

      syncToken();
      let paymentOrder;
      try {
        paymentOrder = await paymentApi.createPaymentOrder(order.id);
      } catch (payErr: unknown) {
        const msg = payErr instanceof Error ? payErr.message : "";
        console.error("Payment order creation failed:", payErr);
        if (msg.toLowerCase().includes("not configured")) {
          throw new Error("Payment gateway is not configured. Please contact support.");
        }
        if (msg.toLowerCase().includes("already paid")) {
          throw new Error("This order is already paid. Check your orders page.");
        }
        throw new Error(msg || "Failed to initialize payment. Please try again or contact support.");
      }
      await openRazorpay(paymentOrder, order.orderNumber);

      setOrderNumber(order.orderNumber);
      setOrderPlaced(true);
      clearCart();
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : "Failed to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleNext = () => {
    if (currentStep === "address") setCurrentStep("review");
    else placeOrder();
  };

  const handleBack = () => {
    if (currentStep === "review") setCurrentStep("address");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Step Indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((step, i) => {
            const completed = i < stepIndex;
            const active = step.id === currentStep;
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center">
                {i > 0 && (
                  <div className={cn("mx-2 h-0.5 w-8 sm:w-16 rounded transition-colors", completed ? "bg-primary-600" : "bg-gray-300")} />
                )}
                <button
                  onClick={() => i < stepIndex && setCurrentStep(step.id)}
                  disabled={i > stepIndex}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 sm:px-4 text-sm font-medium transition-all",
                    active && "bg-primary-600 text-white shadow-sm",
                    completed && "bg-primary-50 text-primary-700 hover:bg-primary-100",
                    !active && !completed && "text-text-muted"
                  )}
                >
                  {completed ? (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white">
                      <Check size={12} />
                    </div>
                  ) : (
                    <Icon size={16} />
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {/* ─── ADDRESS STEP ─── */}
              {currentStep === "address" && (
                <motion.div
                  key="address"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="rounded-2xl border border-border bg-white p-6 shadow-sm"
                >
                  <h2 className="mb-5 text-lg font-bold text-text-primary">Select Delivery Address</h2>

                  {/* Saved addresses */}
                  {addresses.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {addresses.map((addr) => (
                        <label
                          key={addr.id}
                          className={cn(
                            "flex cursor-pointer gap-4 rounded-xl border-2 p-4 transition-all",
                            selectedAddress === addr.id
                              ? "border-primary-500 bg-primary-50"
                              : "border-border hover:border-gray-300"
                          )}
                        >
                          <input
                            type="radio"
                            name="address"
                            checked={selectedAddress === addr.id}
                            onChange={() => setSelectedAddress(addr.id)}
                            className="mt-1 accent-primary-600"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-text-primary">{addr.name}</span>
                              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-text-secondary capitalize">{addr.type.toLowerCase()}</span>
                              {addr.isDefault && (
                                <span className="rounded bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">Default</span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-text-secondary">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
                            <p className="text-sm text-text-secondary">{addr.city}, {addr.state} - {addr.pincode}</p>
                            <p className="mt-1 text-sm text-text-muted">Phone: {addr.phone}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Add new address toggle */}
                  {!showNewAddress && (
                    <button
                      onClick={() => setShowNewAddress(true)}
                      className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-text-secondary hover:border-primary-400 hover:text-primary-600 transition-colors w-full justify-center"
                    >
                      <Plus size={16} /> Add New Address
                    </button>
                  )}

                  {/* New address form */}
                  <AnimatePresence>
                    {showNewAddress && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-xl border border-border bg-gray-50 p-5">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-text-primary">New Address</h3>
                            {addresses.length > 0 && (
                              <button onClick={() => setShowNewAddress(false)} className="text-text-muted hover:text-text-primary">
                                <X size={16} />
                              </button>
                            )}
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <FormInput label="Full Name" value={form.name} error={formErrors.name} onChange={(v) => updateField("name", v)} placeholder="John Doe" />
                            <FormInput label="Phone Number" value={form.phone} error={formErrors.phone} onChange={(v) => updateField("phone", v)} placeholder="+91 98765 43210" />
                            <div className="sm:col-span-2">
                              <FormInput label="Address Line 1" value={form.line1} error={formErrors.line1} onChange={(v) => updateField("line1", v)} placeholder="House/Flat No., Street" />
                            </div>
                            <div className="sm:col-span-2">
                              <FormInput label="Address Line 2 (Optional)" value={form.line2} onChange={(v) => updateField("line2", v)} placeholder="Landmark, Area" />
                            </div>
                            <FormInput label="City" value={form.city} error={formErrors.city} onChange={(v) => updateField("city", v)} placeholder="Mumbai" />
                            <FormInput label="State" value={form.state} error={formErrors.state} onChange={(v) => updateField("state", v)} placeholder="Maharashtra" />
                            <FormInput label="PIN Code" value={form.pincode} error={formErrors.pincode} onChange={(v) => updateField("pincode", v)} placeholder="400001" />
                            <div className="flex items-end gap-4 pb-1">
                              {[{ label: "Home", value: "HOME" }, { label: "Office", value: "OFFICE" }, { label: "Other", value: "OTHER" }].map((t) => (
                                <label key={t.value} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                                  <input
                                    type="radio"
                                    name="addrType"
                                    checked={form.type === t.value}
                                    onChange={() => updateField("type", t.value)}
                                    className="accent-primary-600"
                                  />
                                  {t.label}
                                </label>
                              ))}
                            </div>
                            <div className="sm:col-span-2 pt-1">
                              <button
                                onClick={saveAddress}
                                className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
                              >
                                Save Address
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* ─── REVIEW STEP ─── */}
              {currentStep === "review" && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  {/* Address summary */}
                  <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-text-primary">Delivery Address</h3>
                      <button onClick={() => setCurrentStep("address")} className="text-xs font-medium text-primary-600 hover:text-primary-700">Change</button>
                    </div>
                    {(() => {
                      const addr = addresses.find((a) => a.id === selectedAddress);
                      if (!addr) return <p className="text-sm text-text-muted">No address selected</p>;
                      return (
                        <div className="text-sm text-text-secondary">
                          <p className="font-semibold text-text-primary">{addr.name}</p>
                          <p>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
                          <p>{addr.city}, {addr.state} - {addr.pincode}</p>
                          <p className="text-text-muted mt-1">Phone: {addr.phone}</p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Payment info */}
                  <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                        <CreditCard size={20} className="text-primary-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-text-primary">Secure Payment</h3>
                        <p className="text-xs text-text-secondary">UPI, Cards, Net Banking, Wallets — choose at checkout</p>
                      </div>
                    </div>
                  </div>

                  {/* Order items */}
                  <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-sm font-bold text-text-primary">Order Items ({itemCount})</h3>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className="flex gap-3">
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-gray-50">
                            {item.image ? (
                              <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-text-muted">
                                <Truck size={20} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{item.name}</p>
                            {item.variant && (
                              <p className="text-xs text-text-muted capitalize">{item.variant.replace(/-/g, ' / ')}</p>
                            )}
                            <p className="text-xs text-text-muted">Qty: {item.quantity}</p>
                            <p className="text-sm font-semibold text-text-primary">{formatCurrency(item.price * item.quantity)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right column — Price Details */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 rounded-2xl border border-border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-text-primary">Price Details</h2>
              {(() => {
                const shippingCharge = priceTotal > 499 ? 0 : 49;
                const estTax = Math.round(priceTotal * 0.18);
                const grandTotal = priceTotal + shippingCharge + estTax;
                return (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-text-secondary">
                  <span>Price ({itemCount} items)</span>
                  <span>{formatCurrency(priceTotal + savings)}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-success-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(savings)}</span>
                  </div>
                )}
                <div className="flex justify-between text-text-secondary">
                  <span>Delivery</span>
                  {shippingCharge === 0 ? (
                    <span className="font-semibold text-success-600">FREE</span>
                  ) : (
                    <span>{formatCurrency(shippingCharge)}</span>
                  )}
                </div>
                {estTax > 0 && (
                  <div className="flex justify-between text-text-secondary">
                    <span>Est. Tax (GST)</span>
                    <span>{formatCurrency(estTax)}</span>
                  </div>
                )}
                {shippingCharge > 0 && priceTotal < 499 && (
                  <p className="text-xs text-text-muted">
                    Add {formatCurrency(499 - priceTotal)} more for free delivery
                  </p>
                )}
                <hr className="border-border" />
                <div className="flex justify-between text-lg font-bold text-text-primary">
                  <span>Total Amount</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
                <p className="text-xs text-text-muted">Final tax calculated at order confirmation based on product GST rates</p>
                {savings > 0 && (
                  <p className="rounded-xl bg-success-50 border border-success-200 p-2.5 text-center text-sm font-medium text-success-700">
                    You will save {formatCurrency(savings)}
                  </p>
                )}
              </div>
                );
              })()}

              <div className="mt-6 flex gap-3">
                {stepIndex > 0 && (
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-1 rounded-xl border border-border px-4 py-3 text-sm font-medium text-text-secondary hover:bg-gray-50 transition-colors"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all",
                    currentStep === "review"
                      ? "bg-success-600 hover:bg-success-700"
                      : "bg-primary-600 hover:bg-primary-700",
                    "disabled:opacity-40 disabled:cursor-not-allowed"
                  )}
                >
                  {placingOrder ? (
                    <><Loader2 size={16} className="animate-spin" /> Processing…</>
                  ) : (
                    <>{currentStep === "review" ? "Pay Now" : "Continue"} <ChevronRight size={16} /></>
                  )}
                </button>
              </div>

              {orderError && (
                <div className="mt-3 rounded-xl bg-danger-50 border border-danger-200 p-3 text-sm text-danger-700">
                  {orderError}
                </div>
              )}

              <div className="mt-4 flex items-center gap-2 text-xs text-text-muted">
                <ShieldCheck size={14} className="text-success-600" />
                <span>Safe and Secure Payments. 100% Authentic.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormInput({ label, value, error, onChange, placeholder }: {
  label: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-text-primary outline-none transition-all placeholder:text-text-muted",
          error
            ? "border-danger-400 focus:border-danger-500 focus:ring-1 focus:ring-danger-500/30"
            : "border-border focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
        )}
      />
      {error && <p className="mt-1 text-xs text-danger-500">{error}</p>}
    </div>
  );
}

