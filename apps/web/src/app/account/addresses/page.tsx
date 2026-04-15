"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { MapPin, Plus, Home, Briefcase, Pencil, Trash2, Loader2 } from "lucide-react";
import { usersApi, setAccessToken } from "@xelnova/api";
import type { Address } from "@xelnova/api";
import { lookupPincode } from "@/lib/store/location-store";
import { INDIAN_STATES } from "@/lib/indian-states";

type AddressType = "HOME" | "OFFICE" | "OTHER";

interface LocalAddress {
  id: string;
  label: AddressType;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

const emptyAddress: Omit<LocalAddress, "id"> = {
  label: "HOME",
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

const labelIcons = { HOME: Home, OFFICE: Briefcase, OTHER: MapPin } as const;
const labelDisplay = { HOME: "Home", OFFICE: "Work", OTHER: "Other" } as const;

function mapApiToLocal(addr: Address): LocalAddress {
  return {
    id: addr.id,
    label: (addr.type?.toUpperCase() as AddressType) || "HOME",
    name: addr.fullName,
    phone: addr.phone,
    line1: addr.addressLine1,
    line2: addr.addressLine2 || undefined,
    city: addr.city,
    state: addr.state,
    pincode: addr.pincode,
    isDefault: addr.isDefault,
  };
}

function syncToken() {
  if (typeof document === "undefined") return;
  const m = document.cookie.match(/(?:^|;\s*)xelnova-token=([^;]*)/);
  if (m) setAccessToken(decodeURIComponent(m[1]));
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<LocalAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<(Omit<LocalAddress, "id"> & { id?: string }) | null>(null);
  const [error, setError] = useState("");
  const [pincodeLooking, setPincodeLooking] = useState(false);

  const handlePincodeChange = async (value: string) => {
    if (!editing) return;
    const cleanPincode = value.replace(/\D/g, "").slice(0, 6);
    setEditing({ ...editing, pincode: cleanPincode });

    if (/^[1-9][0-9]{5}$/.test(cleanPincode)) {
      setPincodeLooking(true);
      try {
        const data = await lookupPincode(cleanPincode);
        setEditing((prev) => prev ? {
          ...prev,
          city: data.city || prev.city,
          state: data.state || prev.state,
        } : prev);
      } catch {
        // Pincode lookup failed, user can still enter manually
      } finally {
        setPincodeLooking(false);
      }
    }
  };

  const fetchAddresses = useCallback(async () => {
    try {
      syncToken();
      const data = await usersApi.getAddresses();
      setAddresses((data || []).map(mapApiToLocal));
    } catch (err) {
      console.error("Failed to fetch addresses:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleSave = async () => {
    if (!editing || !editing.name || !editing.line1 || !editing.city || !editing.pincode || !editing.phone) {
      setError("Please fill all required fields");
      return;
    }
    
    setSaving(true);
    setError("");
    
    try {
      syncToken();
      
      const payload = {
        fullName: editing.name.trim(),
        phone: editing.phone.trim(),
        addressLine1: editing.line1.trim(),
        addressLine2: editing.line2?.trim() || null,
        city: editing.city.trim(),
        district: null,
        state: editing.state.trim(),
        pincode: editing.pincode.trim(),
        landmark: null,
        type: editing.label,
      };

      if (editing.id) {
        const updated = await usersApi.updateAddress(editing.id, payload);
        setAddresses((prev) => prev.map((a) => (a.id === editing.id ? mapApiToLocal(updated) : a)));
      } else {
        const created = await usersApi.addAddress(payload);
        setAddresses((prev) => [...prev, mapApiToLocal(created)]);
      }
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    
    setDeleting(id);
    try {
      syncToken();
      await usersApi.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete address");
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      syncToken();
      await usersApi.setDefaultAddress(id);
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to set default address");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">My Addresses</h2>
        {!editing && (
          <button
            onClick={() => setEditing({ ...emptyAddress })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
          >
            <Plus size={16} /> Add Address
          </button>
        )}
      </div>

      {editing ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-white p-6 shadow-card"
        >
          <h3 className="text-base font-semibold text-text-primary mb-4">
            {editing.id ? "Edit Address" : "Add New Address"}
          </h3>
          
          {error && (
            <div className="mb-4 rounded-xl bg-danger-50 border border-danger-200 p-3 text-sm text-danger-700">
              {error}
            </div>
          )}
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1">Address Type</label>
              <div className="flex gap-2">
                {(["HOME", "OFFICE", "OTHER"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEditing({ ...editing, label: type })}
                    className={`rounded-lg px-4 py-2 text-sm font-medium border transition-colors ${
                      editing.label === type
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-gray-200 text-text-secondary hover:border-gray-300"
                    }`}
                  >
                    {labelDisplay[type]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Full Name *</label>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 transition-colors"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Phone Number *</label>
              <input
                type="tel"
                value={editing.phone}
                onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 transition-colors"
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1">Address Line 1 *</label>
              <input
                type="text"
                value={editing.line1}
                onChange={(e) => setEditing({ ...editing, line1: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 transition-colors"
                placeholder="House/Flat No., Street"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1">Address Line 2 <span className="text-text-muted">(Optional)</span></label>
              <input
                type="text"
                value={editing.line2 ?? ""}
                onChange={(e) => setEditing({ ...editing, line2: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 transition-colors"
                placeholder="Landmark, Area"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">PIN Code *</label>
              <div className="relative">
                <input
                  type="text"
                  value={editing.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 transition-colors"
                  placeholder="400001"
                  maxLength={6}
                />
                {pincodeLooking && (
                  <div className="absolute right-3 top-2.5">
                    <Loader2 size={16} className="animate-spin text-primary-600" />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-text-muted mt-0.5">Enter PIN code to auto-fill city & state</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">City *</label>
              <input
                type="text"
                value={editing.city}
                onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 transition-colors"
                placeholder="Mumbai"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">State *</label>
              <select
                value={editing.state}
                onChange={(e) => setEditing({ ...editing, state: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 transition-colors bg-white"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? "Saving..." : "Save Address"}
            </button>
            <button
              onClick={() => { setEditing(null); setError(""); }}
              disabled={saving}
              className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-text-secondary hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white py-16 text-center shadow-card">
          <div className="rounded-full bg-primary-50 p-5 mb-4">
            <MapPin size={36} className="text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">No saved addresses</h3>
          <p className="mt-1 text-sm text-text-secondary max-w-xs">
            Add an address for faster checkout.
          </p>
          <button
            onClick={() => setEditing({ ...emptyAddress })}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-primary"
          >
            <Plus size={16} /> Add Address
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => {
            const Icon = labelIcons[addr.label] ?? MapPin;
            const isDeleting = deleting === addr.id;
            return (
              <motion.div
                key={addr.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border bg-white p-5 shadow-card relative ${
                  addr.isDefault ? "border-primary-300 ring-1 ring-primary-200" : "border-border"
                } ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-text-secondary">
                    <Icon size={12} /> {labelDisplay[addr.label] || addr.label}
                  </span>
                  {addr.isDefault && (
                    <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[10px] font-bold text-primary-700 uppercase tracking-wider">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-text-primary">{addr.name}</p>
                <p className="text-sm text-text-secondary mt-0.5">{addr.line1}</p>
                {addr.line2 && <p className="text-sm text-text-secondary">{addr.line2}</p>}
                <p className="text-sm text-text-secondary">{addr.city}, {addr.state} – {addr.pincode}</p>
                <p className="text-sm text-text-secondary mt-1">Phone: {addr.phone}</p>
                <div className="mt-4 flex items-center gap-2 border-t border-border-light pt-3">
                  <button
                    onClick={() => setEditing({ ...addr })}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <span className="text-border">|</span>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-1 text-xs font-medium text-danger-600 hover:text-danger-700 transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Remove
                  </button>
                  {!addr.isDefault && (
                    <>
                      <span className="text-border">|</span>
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        className="text-xs font-medium text-text-secondary hover:text-primary-600 transition-colors"
                      >
                        Set as Default
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
