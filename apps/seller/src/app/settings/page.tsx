"use client";

import { useState } from "react";
import {
  Store,
  MapPin,
  Phone,
  Mail,
  Globe,
  Shield,
  CreditCard,
  Bell,
  Save,
  Upload,
} from "lucide-react";
import { sellerProfile } from "@/lib/mock-data";

const inputClasses =
  "w-full h-10 px-4 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all";
const labelClasses = "block text-sm font-medium text-slate-700 mb-1.5";

export default function StoreSettingsPage() {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [orderNotifs, setOrderNotifs] = useState(true);
  const [stockNotifs, setStockNotifs] = useState(true);
  const [reviewNotifs, setReviewNotifs] = useState(false);

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-[22px] rounded-full transition-colors ${
        value ? "bg-amber-400" : "bg-warm-300"
      }`}
    >
      <span
        className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${
          value ? "left-5" : "left-0.5"
        }`}
      />
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight">Store Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your store profile, payments, and preferences</p>
      </div>

      {/* Store profile */}
      <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
            <Store size={20} />
          </div>
          <h2 className="text-base font-semibold text-slate-900 font-display">Store Profile</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 mb-6">
          <div className="flex flex-col items-center gap-3">
            <img
              src={sellerProfile.avatar}
              alt={sellerProfile.storeName}
              className="w-20 h-20 rounded-2xl ring-2 ring-warm-200"
            />
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-600 border border-amber-200 hover:bg-amber-50 transition-colors">
              <Upload size={12} /> Change Logo
            </button>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Store Name</label>
              <input type="text" defaultValue={sellerProfile.storeName} className={inputClasses} />
            </div>
            <div>
              <label className={labelClasses}>Owner Name</label>
              <input type="text" defaultValue={sellerProfile.name} className={inputClasses} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClasses}>Store Description</label>
              <textarea
                rows={3}
                placeholder="Tell customers about your store..."
                className="w-full px-4 py-3 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 resize-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600">
            <Phone size={20} />
          </div>
          <h2 className="text-base font-semibold text-slate-900 font-display">Contact Information</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="email" defaultValue={sellerProfile.email} className="w-full h-10 pl-10 pr-4 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all" />
            </div>
          </div>
          <div>
            <label className={labelClasses}>Phone</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="tel" defaultValue={sellerProfile.phone} className="w-full h-10 pl-10 pr-4 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all" />
            </div>
          </div>
          <div>
            <label className={labelClasses}>Website</label>
            <div className="relative">
              <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="url" placeholder="https://yourstore.com" className="w-full h-10 pl-10 pr-4 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all" />
            </div>
          </div>
          <div>
            <label className={labelClasses}>Business Address</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="City, State" className="w-full h-10 pl-10 pr-4 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all" />
            </div>
          </div>
        </div>
      </div>

      {/* Tax & verification */}
      <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <Shield size={20} />
          </div>
          <h2 className="text-base font-semibold text-slate-900 font-display">Tax & Verification</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>GST Number</label>
            <input type="text" defaultValue={sellerProfile.gstNumber} className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>PAN Number</label>
            <input type="text" placeholder="ABCDE1234F" className={inputClasses} />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
          <Shield size={16} className="text-emerald-600 shrink-0" />
          <span className="text-sm text-emerald-700">
            Your store is <strong>verified</strong> and in good standing.
          </span>
        </div>
      </div>

      {/* Payment */}
      <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
            <CreditCard size={20} />
          </div>
          <h2 className="text-base font-semibold text-slate-900 font-display">Payment Details</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Bank Name</label>
            <input type="text" placeholder="e.g. HDFC Bank" className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>Account Number</label>
            <input type="text" placeholder="Account number" className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>IFSC Code</label>
            <input type="text" placeholder="e.g. HDFC0001234" className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>Account Holder Name</label>
            <input type="text" defaultValue={sellerProfile.name} className={inputClasses} />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
            <Bell size={20} />
          </div>
          <h2 className="text-base font-semibold text-slate-900 font-display">Notifications</h2>
        </div>
        <div className="space-y-4">
          {[
            { label: "Email notifications", desc: "Receive important updates via email", value: emailNotifs, setter: setEmailNotifs },
            { label: "New order alerts", desc: "Get notified when you receive a new order", value: orderNotifs, setter: setOrderNotifs },
            { label: "Low stock warnings", desc: "Alert when product stock falls below threshold", value: stockNotifs, setter: setStockNotifs },
            { label: "Review notifications", desc: "Get notified when customers leave reviews", value: reviewNotifs, setter: setReviewNotifs },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between p-3 rounded-xl hover:bg-warm-50 transition-colors">
              <div>
                <p className="text-sm font-medium text-slate-800">{n.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{n.desc}</p>
              </div>
              <Toggle value={n.value} onChange={n.setter} />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3 pb-4">
        <button className="px-5 py-2.5 rounded-xl border border-warm-200 text-sm font-medium text-slate-600 hover:bg-warm-100 transition-colors">
          Cancel
        </button>
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-amber-400 text-white hover:bg-amber-500 transition-colors shadow-soft">
          <Save size={16} />
          Save Changes
        </button>
      </div>
    </div>
  );
}
