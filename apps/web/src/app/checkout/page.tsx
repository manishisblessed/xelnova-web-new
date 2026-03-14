"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, CreditCard, ClipboardCheck, Check, Plus, ChevronRight, ShieldCheck, Truck, Smartphone, Banknote, Building2, ArrowLeft } from "lucide-react";
import { cn } from "@xelnova/utils";
import { formatCurrency } from "@xelnova/utils";
import { useCartStore } from "@/lib/store/cart-store";

type Step = "address" | "payment" | "review";

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: "address", label: "Address", icon: MapPin },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "review", label: "Review", icon: ClipboardCheck },
];

const SAVED_ADDRESSES = [
  { id: "addr-1", name: "Rahul Mehta", phone: "+91 98765 43210", line1: "42, Maple Heights, Sector 15", line2: "Near City Mall", city: "Gurugram", state: "Haryana", pincode: "122001", type: "Home", isDefault: true },
  { id: "addr-2", name: "Rahul Mehta", phone: "+91 98765 43210", line1: "Office #304, Tower B, Cyber Park", line2: "DLF Phase 3", city: "Gurugram", state: "Haryana", pincode: "122002", type: "Work", isDefault: false },
];

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("address");
  const [selectedAddress, setSelectedAddress] = useState(SAVED_ADDRESSES[0].id);
  const [paymentMethod, setPaymentMethod] = useState<string>("upi");
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const totalSavings = useCartStore((s) => s.totalSavings);
  const totalItems = useCartStore((s) => s.totalItems);
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="flex min-h-screen items-center justify-center bg-surface-950"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-400 border-t-transparent" /></div>;

  if (orderPlaced) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-surface-950 px-4 text-center">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 15, stiffness: 200 }} className="mb-6 inline-flex rounded-full bg-success-600/20 p-6 border border-success-600/30">
          <Check size={48} className="text-success-400" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h1 className="text-2xl font-bold text-white font-display">Order Placed!</h1>
          <p className="mt-2 text-surface-100 max-w-md mx-auto">Your order has been placed successfully. You will receive a confirmation shortly.</p>
          <p className="mt-3 text-sm font-medium text-gold-400">Order #XN260310{Math.floor(Math.random() * 900 + 100)}ABC</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/account/orders" className="rounded-xl bg-gold-400 px-6 py-3 text-sm font-semibold text-surface-950 hover:bg-gold-300">View Orders</Link>
            <Link href="/products" className="rounded-xl border border-surface-300 px-6 py-3 text-sm font-semibold text-surface-50 hover:bg-surface-800">Continue Shopping</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-surface-950 px-4 text-center">
        <h1 className="text-2xl font-bold text-white">No items in cart</h1>
        <p className="mt-2 text-surface-100">Add some items to proceed with checkout.</p>
        <Link href="/products" className="mt-6 rounded-xl bg-gold-400 px-6 py-3 text-sm font-semibold text-surface-950 hover:bg-gold-300">Browse Products</Link>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const priceTotal = totalPrice();
  const savings = totalSavings();
  const itemCount = totalItems();
  const canProceed = () => { if (currentStep === "address") return !!selectedAddress; if (currentStep === "payment") return !!paymentMethod; return true; };
  const handleNext = () => { if (currentStep === "address") setCurrentStep("payment"); else if (currentStep === "payment") setCurrentStep("review"); else { setOrderPlaced(true); clearCart(); } };
  const handleBack = () => { if (currentStep === "payment") setCurrentStep("address"); else if (currentStep === "review") setCurrentStep("payment"); };

  return (
    <div className="min-h-screen bg-surface-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Step Indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((step, i) => {
            const completed = i < stepIndex;
            const active = step.id === currentStep;
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center">
                {i > 0 && <div className={cn("mx-2 h-0.5 w-8 sm:w-16 rounded transition-colors", completed ? "bg-gold-400" : "bg-surface-400")} />}
                <button
                  onClick={() => i < stepIndex && setCurrentStep(step.id)}
                  disabled={i > stepIndex}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 sm:px-4 text-sm font-medium transition-all",
                    active && "bg-gold-400 text-surface-950 shadow-glow-sm",
                    completed && "bg-gold-400/10 text-gold-400 hover:bg-gold-400/20",
                    !active && !completed && "text-surface-200"
                  )}
                >
                  {completed ? <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-400 text-surface-950"><Check size={12} /></div> : <Icon size={16} />}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {currentStep === "address" && (
                <motion.div key="address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="rounded-2xl border border-surface-300/50 bg-surface-800 p-6">
                  <h2 className="mb-5 text-lg font-bold text-white font-display">Select Delivery Address</h2>
                  <div className="space-y-3">
                    {SAVED_ADDRESSES.map((addr) => (
                      <label key={addr.id} className={cn("flex cursor-pointer gap-4 rounded-xl border-2 p-4 transition-all", selectedAddress === addr.id ? "border-gold-400 bg-gold-400/5" : "border-surface-300/50 hover:border-surface-200")}>
                        <input type="radio" name="address" checked={selectedAddress === addr.id} onChange={() => setSelectedAddress(addr.id)} className="mt-1 accent-gold-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{addr.name}</span>
                            <span className="rounded bg-surface-600 px-2 py-0.5 text-xs font-medium text-surface-50">{addr.type}</span>
                            {addr.isDefault && <span className="rounded bg-gold-400/10 px-2 py-0.5 text-xs font-medium text-gold-400">Default</span>}
                          </div>
                          <p className="mt-1 text-sm text-surface-100">{addr.line1}, {addr.line2}</p>
                          <p className="text-sm text-surface-100">{addr.city}, {addr.state} - {addr.pincode}</p>
                          <p className="mt-1 text-sm text-surface-200">Phone: {addr.phone}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button onClick={() => setShowNewAddress(!showNewAddress)} className="mt-4 flex items-center gap-2 rounded-xl border-2 border-dashed border-surface-300 px-4 py-3 text-sm font-medium text-surface-100 hover:border-gold-400/50 hover:text-gold-400 transition-colors w-full justify-center">
                    <Plus size={16} /> Add New Address
                  </button>
                  <AnimatePresence>
                    {showNewAddress && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-4 grid gap-4 rounded-xl border border-surface-300/50 p-4 sm:grid-cols-2">
                          {["Full Name", "Phone Number"].map((p) => <input key={p} placeholder={p} className="rounded-lg border border-surface-300 bg-surface-700 px-3 py-2.5 text-sm text-white outline-none focus:border-gold-400 placeholder:text-surface-200" />)}
                          <input placeholder="Address Line 1" className="rounded-lg border border-surface-300 bg-surface-700 px-3 py-2.5 text-sm text-white outline-none focus:border-gold-400 placeholder:text-surface-200 sm:col-span-2" />
                          <input placeholder="Address Line 2 (Optional)" className="rounded-lg border border-surface-300 bg-surface-700 px-3 py-2.5 text-sm text-white outline-none focus:border-gold-400 placeholder:text-surface-200 sm:col-span-2" />
                          {["City", "State", "PIN Code"].map((p) => <input key={p} placeholder={p} className="rounded-lg border border-surface-300 bg-surface-700 px-3 py-2.5 text-sm text-white outline-none focus:border-gold-400 placeholder:text-surface-200" />)}
                          <div className="flex items-center gap-4">
                            {["Home", "Work"].map((t) => <label key={t} className="flex items-center gap-2 text-sm text-surface-100"><input type="radio" name="addrType" defaultChecked={t === "Home"} className="accent-gold-400" />{t}</label>)}
                          </div>
                          <div className="sm:col-span-2"><button className="rounded-lg bg-gold-400 px-6 py-2.5 text-sm font-semibold text-surface-950 hover:bg-gold-300 transition-colors">Save Address</button></div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {currentStep === "payment" && (
                <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="rounded-2xl border border-surface-300/50 bg-surface-800 p-6">
                  <h2 className="mb-5 text-lg font-bold text-white font-display">Payment Method</h2>
                  <div className="space-y-3">
                    <PaymentOption id="upi" selected={paymentMethod === "upi"} onSelect={setPaymentMethod} icon={Smartphone} title="UPI" subtitle="Pay using any UPI app">
                      <div className="mt-3"><input placeholder="Enter UPI ID (e.g., name@upi)" className="w-full rounded-lg border border-surface-300 bg-surface-700 px-3 py-2.5 text-sm text-white outline-none focus:border-gold-400 placeholder:text-surface-200" /></div>
                    </PaymentOption>
                    <PaymentOption id="card" selected={paymentMethod === "card"} onSelect={setPaymentMethod} icon={CreditCard} title="Credit / Debit Card" subtitle="Visa, Mastercard, RuPay">
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {["Card Number", "Name on Card"].map((p) => <input key={p} placeholder={p} className="rounded-lg border border-surface-300 bg-surface-700 px-3 py-2.5 text-sm text-white outline-none focus:border-gold-400 placeholder:text-surface-200 sm:col-span-2" />)}
                        <input placeholder="Expiry (MM/YY)" className="rounded-lg border border-surface-300 bg-surface-700 px-3 py-2.5 text-sm text-white outline-none focus:border-gold-400 placeholder:text-surface-200" />
                        <input placeholder="CVV" type="password" maxLength={4} className="rounded-lg border border-surface-300 bg-surface-700 px-3 py-2.5 text-sm text-white outline-none focus:border-gold-400 placeholder:text-surface-200" />
                      </div>
                    </PaymentOption>
                    <PaymentOption id="cod" selected={paymentMethod === "cod"} onSelect={setPaymentMethod} icon={Banknote} title="Cash on Delivery" subtitle="Pay when you receive" />
                    <PaymentOption id="netbanking" selected={paymentMethod === "netbanking"} onSelect={setPaymentMethod} icon={Building2} title="Net Banking" subtitle="All major banks">
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {["SBI", "HDFC", "ICICI", "Axis", "Kotak", "PNB", "BOB", "Others"].map((bank) => (
                          <button key={bank} className="rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-50 hover:border-gold-400/50 hover:text-gold-400 transition-colors">{bank}</button>
                        ))}
                      </div>
                    </PaymentOption>
                  </div>
                </motion.div>
              )}

              {currentStep === "review" && (
                <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <div className="rounded-2xl border border-surface-300/50 bg-surface-800 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-white">Delivery Address</h3>
                      <button onClick={() => setCurrentStep("address")} className="text-xs font-medium text-gold-400 hover:text-gold-300">Change</button>
                    </div>
                    {(() => { const addr = SAVED_ADDRESSES.find((a) => a.id === selectedAddress); if (!addr) return null; return (<div className="text-sm text-surface-100"><p className="font-semibold text-white">{addr.name}</p><p>{addr.line1}, {addr.line2}</p><p>{addr.city}, {addr.state} - {addr.pincode}</p><p>Phone: {addr.phone}</p></div>); })()}
                  </div>
                  <div className="rounded-2xl border border-surface-300/50 bg-surface-800 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-white">Payment Method</h3>
                      <button onClick={() => setCurrentStep("payment")} className="text-xs font-medium text-gold-400 hover:text-gold-300">Change</button>
                    </div>
                    <p className="text-sm text-surface-100 capitalize">{paymentMethod === "upi" ? "UPI Payment" : paymentMethod === "cod" ? "Cash on Delivery" : paymentMethod === "card" ? "Credit / Debit Card" : "Net Banking"}</p>
                  </div>
                  <div className="rounded-2xl border border-surface-300/50 bg-surface-800 p-5">
                    <h3 className="mb-4 text-sm font-bold text-white">Order Items ({itemCount})</h3>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className="flex gap-3">
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-surface-300/30"><Image src={item.image} alt={item.name} fill className="object-cover" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{item.name}</p>
                            <p className="text-xs text-surface-200">Qty: {item.quantity}</p>
                            <p className="text-sm font-semibold text-white">{formatCurrency(item.price * item.quantity)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-28 rounded-2xl border border-surface-300/50 bg-surface-800 p-6">
              <h2 className="mb-4 text-lg font-bold text-white">Price Details</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-surface-100"><span>Price ({itemCount} items)</span><span>{formatCurrency(priceTotal + savings)}</span></div>
                {savings > 0 && <div className="flex justify-between text-success-400"><span>Discount</span><span>-{formatCurrency(savings)}</span></div>}
                <div className="flex justify-between text-surface-100"><span>Delivery</span><span className="font-semibold text-success-400">FREE</span></div>
                <hr className="border-surface-300/30" />
                <div className="flex justify-between text-lg font-bold text-white"><span>Total Amount</span><span>{formatCurrency(priceTotal)}</span></div>
                {savings > 0 && <p className="rounded-xl bg-success-600/10 border border-success-600/20 p-2.5 text-center text-sm font-medium text-success-400">You will save {formatCurrency(savings)}</p>}
              </div>
              <div className="mt-6 flex gap-3">
                {stepIndex > 0 && <button onClick={handleBack} className="flex items-center gap-1 rounded-xl border border-surface-300 px-4 py-3 text-sm font-medium text-surface-100 hover:bg-surface-700 transition-colors"><ArrowLeft size={16} />Back</button>}
                <button onClick={handleNext} disabled={!canProceed()} className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-surface-950 transition-all", currentStep === "review" ? "bg-success-500 hover:bg-success-400" : "bg-gold-400 hover:bg-gold-300", "disabled:opacity-50 disabled:cursor-not-allowed")}>
                  {currentStep === "review" ? "Place Order" : "Continue"} <ChevronRight size={16} />
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-surface-200"><ShieldCheck size={14} className="text-success-400" /><span>Safe and Secure Payments. 100% Authentic.</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentOption({ id, selected, onSelect, icon: Icon, title, subtitle, children }: { id: string; selected: boolean; onSelect: (id: string) => void; icon: React.ElementType; title: string; subtitle: string; children?: React.ReactNode; }) {
  return (
    <div className={cn("rounded-xl border-2 p-4 transition-all cursor-pointer", selected ? "border-gold-400 bg-gold-400/5" : "border-surface-300/50 hover:border-surface-200")} onClick={() => onSelect(id)}>
      <div className="flex items-center gap-3">
        <input type="radio" name="payment" checked={selected} onChange={() => onSelect(id)} className="accent-gold-400" />
        <Icon size={20} className={selected ? "text-gold-400" : "text-surface-200"} />
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-surface-100">{subtitle}</p>
        </div>
      </div>
      {selected && children}
    </div>
  );
}
