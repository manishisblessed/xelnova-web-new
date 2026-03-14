"use client";

import { useState } from "react";
import {
  Palette,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Package,
} from "lucide-react";

interface Brand {
  id: string;
  name: string;
  logo: string;
  status: "Approved" | "Pending" | "Rejected";
  productsCount: number;
  category: string;
  createdAt: string;
}

const brands: Brand[] = [
  { id: "B-001", name: "boAt", logo: "https://placehold.co/80x80/f59e0b/ffffff?text=boAt", status: "Approved", productsCount: 3, category: "Audio", createdAt: "2024-01-15" },
  { id: "B-002", name: "Samsung", logo: "https://placehold.co/80x80/3b82f6/ffffff?text=Sam", status: "Approved", productsCount: 1, category: "Electronics", createdAt: "2024-02-20" },
  { id: "B-003", name: "Noise", logo: "https://placehold.co/80x80/10b981/ffffff?text=Noise", status: "Approved", productsCount: 1, category: "Wearables", createdAt: "2024-03-10" },
  { id: "B-004", name: "JBL", logo: "https://placehold.co/80x80/ef4444/ffffff?text=JBL", status: "Approved", productsCount: 1, category: "Audio", createdAt: "2024-01-25" },
  { id: "B-005", name: "Lenovo", logo: "https://placehold.co/80x80/6366f1/ffffff?text=Len", status: "Approved", productsCount: 1, category: "Laptops", createdAt: "2024-04-05" },
  { id: "B-006", name: "Xiaomi", logo: "https://placehold.co/80x80/f97316/ffffff?text=Mi", status: "Approved", productsCount: 1, category: "Electronics", createdAt: "2024-02-10" },
  { id: "B-007", name: "OnePlus", logo: "https://placehold.co/80x80/dc2626/ffffff?text=1+", status: "Pending", productsCount: 1, category: "Audio", createdAt: "2025-03-01" },
  { id: "B-008", name: "Ambrane", logo: "https://placehold.co/80x80/78350f/ffffff?text=Amb", status: "Pending", productsCount: 0, category: "Accessories", createdAt: "2025-03-08" },
];

const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  Approved: { icon: <CheckCircle2 size={14} />, color: "text-emerald-700", bg: "bg-emerald-100" },
  Pending: { icon: <Clock size={14} />, color: "text-amber-700", bg: "bg-amber-100" },
  Rejected: { icon: <XCircle size={14} />, color: "text-rose-700", bg: "bg-rose-100" },
};

export default function BrandManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const filtered = brands.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const approvedCount = brands.filter((b) => b.status === "Approved").length;
  const pendingCount = brands.filter((b) => b.status === "Pending").length;

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight">Brand Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage the brands you sell on the marketplace</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-amber-400 text-white hover:bg-amber-500 transition-colors shadow-soft w-fit"
        >
          <Plus size={16} />
          Request New Brand
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-warm-200 p-5 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            <Palette size={22} className="text-violet-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{brands.length}</p>
            <p className="text-sm text-slate-500">Total brands</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-warm-200 p-5 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{approvedCount}</p>
            <p className="text-sm text-slate-500">Approved</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-warm-200 p-5 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Clock size={22} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
            <p className="text-sm text-slate-500">Pending approval</p>
          </div>
        </div>
      </div>

      {/* Add brand form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-6">
          <h2 className="text-base font-semibold text-slate-900 font-display mb-4">Request New Brand</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Brand Name *</label>
              <input
                type="text"
                placeholder="e.g. Sony"
                className="w-full h-10 px-4 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category *</label>
              <select className="w-full h-10 px-4 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all">
                <option>Select Category</option>
                <option>Audio</option>
                <option>Electronics</option>
                <option>Wearables</option>
                <option>Laptops</option>
                <option>Accessories</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason for Request</label>
              <textarea
                rows={3}
                placeholder="Why do you want to sell this brand?"
                className="w-full px-4 py-3 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 resize-none transition-all"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl border border-warm-200 text-sm font-medium text-slate-600 hover:bg-warm-100 transition-colors"
            >
              Cancel
            </button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-400 text-white hover:bg-amber-500 transition-colors shadow-soft">
              Submit Request
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search brands..."
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
        />
      </div>

      {/* Brand grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((brand) => {
          const status = statusConfig[brand.status];
          return (
            <div
              key={brand.id}
              className="bg-white rounded-2xl border border-warm-200 shadow-soft overflow-hidden hover:shadow-card transition-all group"
            >
              <div className="p-5 flex flex-col items-center text-center">
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="w-16 h-16 rounded-2xl object-cover ring-1 ring-warm-200 mb-3"
                />
                <h3 className="text-base font-semibold text-slate-800">{brand.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{brand.category}</p>

                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium mt-3 ${status.bg} ${status.color}`}>
                  {status.icon}
                  {brand.status}
                </span>

                <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                  <Package size={12} />
                  <span>{brand.productsCount} product{brand.productsCount !== 1 ? "s" : ""}</span>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-warm-100 flex items-center justify-between bg-warm-50/50">
                <span className="text-[11px] text-slate-400">Added {brand.createdAt}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                    <Edit size={14} />
                  </button>
                  <button className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-12 text-center">
          <Palette size={40} className="mx-auto text-warm-300 mb-3" />
          <p className="text-slate-500 text-sm">No brands match your search</p>
        </div>
      )}
    </div>
  );
}
