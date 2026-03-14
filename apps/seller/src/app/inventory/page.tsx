"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  AlertTriangle,
  Package,
  TrendingDown,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from "lucide-react";
import { products, formatINR } from "@/lib/mock-data";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

type StockFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";

const stockFilters: { label: string; value: StockFilter; icon: React.ReactNode; color: string; bg: string }[] = [
  { label: "All Products", value: "all", icon: <Package size={18} />, color: "text-slate-600", bg: "bg-slate-100" },
  { label: "In Stock", value: "in-stock", icon: <CheckCircle2 size={18} />, color: "text-emerald-600", bg: "bg-emerald-100" },
  { label: "Low Stock", value: "low-stock", icon: <TrendingDown size={18} />, color: "text-amber-600", bg: "bg-amber-100" },
  { label: "Out of Stock", value: "out-of-stock", icon: <AlertTriangle size={18} />, color: "text-rose-600", bg: "bg-rose-100" },
];

function getStockStatus(stock: number) {
  if (stock === 0) return { label: "Out of Stock", color: "text-rose-700", bg: "bg-rose-100" };
  if (stock <= 50) return { label: "Low Stock", color: "text-amber-700", bg: "bg-amber-100" };
  return { label: "In Stock", color: "text-emerald-700", bg: "bg-emerald-100" };
}

function getBarWidth(stock: number) {
  const max = Math.max(...products.map((p) => p.stock));
  return max > 0 ? (stock / max) * 100 : 0;
}

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<StockFilter>("all");

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === "in-stock") return matchesSearch && p.stock > 50;
    if (activeFilter === "low-stock") return matchesSearch && p.stock > 0 && p.stock <= 50;
    if (activeFilter === "out-of-stock") return matchesSearch && p.stock === 0;
    return matchesSearch;
  });

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 50).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-8">
      <motion.div variants={item}>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight">Inventory</h1>
        <p className="text-sm text-slate-500 mt-1">Track stock levels and manage your product inventory</p>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div variants={item} className="bg-white rounded-2xl border border-warm-200 p-5 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
            <Package size={22} className="text-sky-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{totalStock.toLocaleString()}</p>
            <p className="text-sm text-slate-500">Total units in stock</p>
          </div>
        </motion.div>
        <motion.div variants={item} className="bg-white rounded-2xl border border-warm-200 p-5 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <TrendingDown size={22} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{lowStockCount}</p>
            <p className="text-sm text-slate-500">Low stock alerts</p>
          </div>
        </motion.div>
        <motion.div variants={item} className="bg-white rounded-2xl border border-warm-200 p-5 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} className="text-rose-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{outOfStockCount}</p>
            <p className="text-sm text-slate-500">Out of stock</p>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {stockFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                activeFilter === f.value
                  ? "bg-amber-100 border-amber-200 text-amber-700"
                  : "bg-white border-warm-200 text-slate-600 hover:bg-warm-50"
              }`}
            >
              {f.icon}
              <span className="hidden sm:inline">{f.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Inventory table */}
      <motion.div variants={item} className="bg-white rounded-2xl border border-warm-200 overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-warm-100/80">
                <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">Product</th>
                <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">SKU</th>
                <th className="text-center text-xs font-medium text-slate-500 px-6 py-3">Stock</th>
                <th className="text-left text-xs font-medium text-slate-500 px-6 py-3 hidden lg:table-cell">Stock Level</th>
                <th className="text-center text-xs font-medium text-slate-500 px-6 py-3">Status</th>
                <th className="text-right text-xs font-medium text-slate-500 px-6 py-3">Price</th>
                <th className="text-right text-xs font-medium text-slate-500 px-6 py-3">Stock Value</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const status = getStockStatus(product.stock);
                return (
                  <tr key={product.id} className="border-t border-warm-100 hover:bg-warm-50/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <img src={product.image} alt={product.name} className="w-10 h-10 rounded-xl object-cover ring-1 ring-warm-200" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate max-w-[200px]">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm text-slate-600 font-mono">{product.sku}</span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="text-sm font-semibold text-slate-800">{product.stock}</span>
                    </td>
                    <td className="px-6 py-3.5 hidden lg:table-cell">
                      <div className="w-full max-w-[120px] h-2 bg-warm-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            product.stock === 0 ? "bg-rose-400" : product.stock <= 50 ? "bg-amber-400" : "bg-emerald-400"
                          }`}
                          style={{ width: `${getBarWidth(product.stock)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span className="text-sm font-medium text-slate-800">{formatINR(product.price)}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span className="text-sm font-semibold text-slate-800">{formatINR(product.stock * product.price)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-12 text-center">
            <Filter size={40} className="mx-auto text-warm-300 mb-3" />
            <p className="text-slate-500 text-sm">No products match your filters</p>
            <button
              onClick={() => { setSearchQuery(""); setActiveFilter("all"); }}
              className="text-amber-600 text-sm font-medium mt-2 hover:text-amber-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
