"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Filter,
  Star,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { products, formatINR } from "@/lib/mock-data";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const statusColors: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-800",
  "Pending Approval": "bg-amber-100 text-amber-800",
  Draft: "bg-slate-100 text-slate-600",
  "Out of Stock": "bg-rose-100 text-rose-800",
};

const categories = ["All", "Audio", "Smartphones", "Wearables", "Laptops", "Accessories"];
const statuses = ["All", "Active", "Pending Approval", "Draft", "Out of Stock"];

export default function ProductsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    const matchesStatus = selectedStatus === "All" || product.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">My Products</h1>
          <p className="text-sm text-slate-500 mt-1">{products.length} products in your catalog</p>
        </div>
        <Link
          href="/products/add"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-amber-400 text-white hover:bg-amber-500 transition-colors shadow-soft"
        >
          <Plus size={16} />
          Add New Product
        </Link>
      </motion.div>

      <motion.div variants={item} className="bg-white rounded-2xl border border-warm-200 shadow-soft p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-warm-100 border border-warm-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 px-3 rounded-lg bg-warm-100 border border-warm-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat === "All" ? "All Categories" : cat}</option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 px-3 rounded-lg bg-warm-100 border border-warm-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>
              ))}
            </select>
            <div className="flex items-center border border-warm-200 rounded-lg overflow-hidden ml-auto">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 ${viewMode === "grid" ? "bg-amber-100 text-amber-600" : "text-slate-400 hover:text-slate-600"}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 ${viewMode === "table" ? "bg-amber-100 text-amber-600" : "text-slate-400 hover:text-slate-600"}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              variants={item}
              className="bg-white rounded-2xl border border-warm-200 shadow-soft overflow-hidden hover:shadow-card transition-all duration-200 hover:-translate-y-0.5 group"
            >
              <div className="relative aspect-square bg-warm-100">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <span
                  className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    statusColors[product.status]
                  }`}
                >
                  {product.status}
                </span>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === product.id ? null : product.id)}
                      className="w-7 h-7 rounded-full bg-white shadow-card flex items-center justify-center border border-warm-200"
                    >
                      <MoreVertical size={14} className="text-slate-800" />
                    </button>
                    {activeMenu === product.id && (
                      <div className="absolute right-0 top-9 w-36 bg-white rounded-xl shadow-card border border-warm-200 py-1 z-10">
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-warm-50">
                          <Eye size={13} /> View
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-warm-50">
                          <Edit size={13} /> Edit
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-100">
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs text-slate-500 mb-1">{product.category} · {product.brand}</p>
                <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug">
                  {product.name}
                </h3>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-base font-bold text-slate-900">{formatINR(product.price)}</span>
                  {product.compareAtPrice && (
                    <span className="text-xs text-slate-500 line-through">
                      {formatINR(product.compareAtPrice)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-warm-200">
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    <span className="text-xs font-medium text-slate-600">
                      {product.rating > 0 ? product.rating : "—"}
                    </span>
                    {product.reviewCount > 0 && (
                      <span className="text-xs text-slate-500">({product.reviewCount})</span>
                    )}
                  </div>
                  <span className={`text-xs font-medium ${product.stock > 50 ? "text-emerald-600" : product.stock > 0 ? "text-amber-600" : "text-rose-600"}`}>
                    {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div variants={item} className="bg-white rounded-2xl border border-warm-200 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-warm-100/80">
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Product</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Category</th>
                  <th className="text-right text-xs font-medium text-slate-500 px-5 py-3">Price</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-5 py-3">Stock</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-5 py-3">Status</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-5 py-3">Rating</th>
                  <th className="text-right text-xs font-medium text-slate-500 px-5 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-t border-warm-100 hover:bg-warm-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-800 line-clamp-1">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-slate-600">{product.category}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-sm font-medium text-slate-800">{formatINR(product.price)}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-sm font-medium ${product.stock > 50 ? "text-emerald-600" : product.stock > 0 ? "text-amber-600" : "text-rose-600"}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[product.status]}`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span className="text-sm text-slate-600">{product.rating > 0 ? product.rating : "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-sm font-medium text-slate-800">{formatINR(product.revenue)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {filteredProducts.length === 0 && (
        <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-12 text-center">
          <Filter size={40} className="mx-auto text-slate-400 mb-3" />
          <p className="text-slate-600 text-sm">No products match your filters</p>
          <button
            onClick={() => { setSearchQuery(""); setSelectedCategory("All"); setSelectedStatus("All"); }}
            className="text-amber-600 text-sm font-medium mt-2 hover:text-amber-700"
          >
            Clear Filters
          </button>
        </div>
      )}
    </motion.div>
  );
}
