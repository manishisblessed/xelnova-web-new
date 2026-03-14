"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Upload,
  Plus,
  X,
  Save,
  Send,
  ImageIcon,
} from "lucide-react";
import Link from "next/link";

const categories = [
  "Select Category",
  "Audio",
  "Smartphones",
  "Wearables",
  "Laptops",
  "Accessories",
  "Tablets",
  "Gaming",
  "Cameras",
];

const brands = [
  "Select Brand",
  "boAt",
  "Samsung",
  "Noise",
  "JBL",
  "Lenovo",
  "Xiaomi",
  "OnePlus",
  "Ambrane",
  "Realme",
  "Apple",
  "Sony",
];

const gstRates = ["Select GST Rate", "0%", "5%", "12%", "18%", "28%"];

const inputClasses = "w-full h-10 px-4 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400";
const labelClasses = "block text-sm font-medium text-slate-700 mb-1.5";
const selectClasses = "w-full h-10 px-4 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400";

export default function AddProductPage() {
  const [variants, setVariants] = useState<{ option: string; values: string[] }[]>([]);
  const [newVariantOption, setNewVariantOption] = useState("");
  const [freeShipping, setFreeShipping] = useState(false);

  const addVariant = () => {
    if (newVariantOption.trim()) {
      setVariants([...variants, { option: newVariantOption.trim(), values: [] }]);
      setNewVariantOption("");
    }
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const addVariantValue = (variantIndex: number, value: string) => {
    if (value.trim()) {
      const updated = [...variants];
      updated[variantIndex].values.push(value.trim());
      setVariants(updated);
    }
  };

  const removeVariantValue = (variantIndex: number, valueIndex: number) => {
    const updated = [...variants];
    updated[variantIndex].values = updated[variantIndex].values.filter((_, i) => i !== valueIndex);
    setVariants(updated);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/products"
          className="w-9 h-9 rounded-lg border border-warm-200 flex items-center justify-center hover:bg-warm-100 transition-colors text-slate-500"
        >
          <ArrowLeft size={16} className="text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Add New Product</h1>
          <p className="text-sm text-slate-700 mt-0.5">Fill in the details to list a new product</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-6">
        <h2 className="text-base font-semibold text-slate-900 font-display mb-4">Basic Information</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClasses}>Product Name *</label>
            <input
              type="text"
              placeholder="e.g. boAt Rockerz 450 Wireless Headphone"
              className={inputClasses}
            />
          </div>
          <div>
            <label className={labelClasses}>Short Description *</label>
            <input
              type="text"
              placeholder="Brief one-line description"
              className={inputClasses}
            />
          </div>
          <div>
            <label className={labelClasses}>Full Description *</label>
            <textarea
              rows={5}
              placeholder="Detailed product description with features, specifications..."
              className="w-full px-4 py-3 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 resize-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-6">
        <h2 className="text-base font-semibold text-slate-900 font-display mb-4">Pricing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClasses}>Selling Price (₹) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
              <input
                type="number"
                placeholder="0.00"
                className="w-full h-10 pl-7 pr-4 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
              />
            </div>
          </div>
          <div>
            <label className={labelClasses}>Compare At Price (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
              <input
                type="number"
                placeholder="0.00"
                className="w-full h-10 pl-7 pr-4 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
              />
            </div>
          </div>
          <div>
            <label className={labelClasses}>Cost Price (₹) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
              <input
                type="number"
                placeholder="0.00"
                className="w-full h-10 pl-7 pr-4 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-6">
        <h2 className="text-base font-semibold text-slate-900 font-display mb-4">Category & Brand</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>Category *</label>
            <select className={selectClasses}>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClasses}>Brand *</label>
            <select className={selectClasses}>
              {brands.map((brand) => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-6">
        <h2 className="text-base font-semibold text-slate-900 font-display mb-4">Product Images</h2>
        <div className="border-2 border-dashed border-warm-300 rounded-xl p-8 text-center hover:border-amber-400 transition-colors cursor-pointer bg-warm-50">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
            <ImageIcon size={24} className="text-amber-600" />
          </div>
          <p className="text-sm font-medium text-slate-700">
            Drag & drop images here or{" "}
            <span className="text-amber-600">browse files</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP up to 5MB. Maximum 8 images.</p>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-xl border border-dashed border-warm-300 flex items-center justify-center bg-warm-50"
            >
              <Upload size={16} className="text-slate-400" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-6">
        <h2 className="text-base font-semibold text-slate-900 font-display mb-4">Inventory</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClasses}>SKU *</label>
            <input
              type="text"
              placeholder="e.g. BOAT-RZ450-BLK"
              className={inputClasses}
            />
          </div>
          <div>
            <label className={labelClasses}>Barcode (EAN/UPC)</label>
            <input
              type="text"
              placeholder="e.g. 8901234567890"
              className={inputClasses}
            />
          </div>
          <div>
            <label className={labelClasses}>Stock Quantity *</label>
            <input
              type="number"
              placeholder="0"
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-6">
        <h2 className="text-base font-semibold text-slate-900 font-display mb-4">Shipping</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelClasses}>Weight (g)</label>
            <input type="number" placeholder="e.g. 250" className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>Length (cm)</label>
            <input type="number" placeholder="0" className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>Width (cm)</label>
            <input type="number" placeholder="0" className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>Height (cm)</label>
            <input type="number" placeholder="0" className={inputClasses} />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-warm-200">
          <button
            onClick={() => setFreeShipping(!freeShipping)}
            className={`relative w-10 h-5.5 rounded-full transition-colors ${
              freeShipping ? "bg-amber-400" : "bg-warm-300"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${
                freeShipping ? "left-5" : "left-0.5"
              }`}
            />
          </button>
          <span className="text-sm text-slate-700">Offer Free Shipping</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-6">
        <h2 className="text-base font-semibold text-slate-900 font-display mb-4">Tax Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>GST Rate *</label>
            <select className={selectClasses}>
              {gstRates.map((rate) => (
                <option key={rate} value={rate}>{rate}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClasses}>HSN Code</label>
            <input
              type="text"
              placeholder="e.g. 8518"
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-warm-200 shadow-soft p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900 font-display">Variants</h2>
        </div>
        <div className="space-y-3">
          {variants.map((variant, vIndex) => (
            <div key={vIndex} className="border border-warm-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-900">{variant.option}</span>
                <button
                  onClick={() => removeVariant(vIndex)}
                  className="text-slate-500 hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {variant.values.map((val, valIndex) => (
                  <span
                    key={valIndex}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-medium"
                  >
                    {val}
                    <button onClick={() => removeVariantValue(vIndex, valIndex)}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Type a value and press Enter"
                className="w-full h-8 px-3 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addVariantValue(vIndex, (e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <input
            type="text"
            value={newVariantOption}
            onChange={(e) => setNewVariantOption(e.target.value)}
            placeholder="Variant option (e.g. Color, Size)"
            className="flex-1 h-9 px-3 rounded-xl bg-warm-100 border border-warm-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
            onKeyDown={(e) => {
              if (e.key === "Enter") addVariant();
            }}
          />
          <button
            onClick={addVariant}
            className="flex items-center gap-1.5 px-4 h-9 rounded-lg border border-amber-400/30 text-amber-600 text-sm font-medium hover:bg-amber-50 transition-colors"
          >
            <Plus size={14} /> Add Variant
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pb-8">
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-warm-200 text-sm font-medium text-slate-600 hover:bg-warm-100 transition-colors">
          <Save size={16} />
          Save as Draft
        </button>
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-amber-400 text-white hover:bg-amber-500 transition-colors shadow-soft">
          <Send size={16} />
          Submit for Review
        </button>
      </div>
    </div>
  );
}
