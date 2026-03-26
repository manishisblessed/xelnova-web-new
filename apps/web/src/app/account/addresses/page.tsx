"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Plus, Home, Briefcase, Pencil, Trash2 } from "lucide-react";

interface Address {
  id: string;
  label: "Home" | "Work" | "Other";
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

const emptyAddress: Omit<Address, "id"> = {
  label: "Home",
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

const labelIcons = { Home: Home, Work: Briefcase, Other: MapPin } as const;

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editing, setEditing] = useState<Omit<Address, "id"> & { id?: string } | null>(null);

  const handleSave = () => {
    if (!editing || !editing.name || !editing.line1 || !editing.city || !editing.pincode) return;
    if (editing.id) {
      setAddresses((prev) => prev.map((a) => (a.id === editing.id ? { ...editing, id: a.id } as Address : a)));
    } else {
      setAddresses((prev) => [...prev, { ...editing, id: crypto.randomUUID() } as Address]);
    }
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSetDefault = (id: string) => {
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
  };

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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1">Address Type</label>
              <div className="flex gap-2">
                {(["Home", "Work", "Other"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setEditing({ ...editing, label: type })}
                    className={`rounded-lg px-4 py-2 text-sm font-medium border transition-colors ${
                      editing.label === type
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-gray-200 text-text-secondary hover:border-gray-300"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Full Name</label>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 transition-colors"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Phone Number</label>
              <input
                type="tel"
                value={editing.phone}
                onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 transition-colors"
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1">Address Line 1</label>
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
              <label className="block text-sm font-medium text-text-secondary mb-1">City</label>
              <input
                type="text"
                value={editing.city}
                onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 transition-colors"
                placeholder="Mumbai"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">State</label>
              <input
                type="text"
                value={editing.state}
                onChange={(e) => setEditing({ ...editing, state: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 transition-colors"
                placeholder="Maharashtra"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">PIN Code</label>
              <input
                type="text"
                value={editing.pincode}
                onChange={(e) => setEditing({ ...editing, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary-500 transition-colors"
                placeholder="400001"
                maxLength={6}
              />
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={handleSave}
              className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
            >
              Save Address
            </button>
            <button
              onClick={() => setEditing(null)}
              className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-text-secondary hover:bg-gray-50 transition-colors"
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
            return (
              <motion.div
                key={addr.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border bg-white p-5 shadow-card relative ${
                  addr.isDefault ? "border-primary-300 ring-1 ring-primary-200" : "border-border"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-text-secondary">
                    <Icon size={12} /> {addr.label}
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
                    className="inline-flex items-center gap-1 text-xs font-medium text-danger-600 hover:text-danger-700 transition-colors"
                  >
                    <Trash2 size={12} /> Remove
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
