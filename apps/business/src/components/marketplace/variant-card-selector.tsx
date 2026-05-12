"use client";

import Image from "next/image";
import { Check, Truck } from "lucide-react";
import { cn } from "@xelnova/utils";
import { priceInclusiveOfGst } from "@xelnova/utils";

interface VariantOption {
  value: string;
  label: string;
  available: boolean;
  images?: string[];
  price?: number;
  compareAtPrice?: number;
  stock?: number;
  hex?: string;
}

interface VariantCardSelectorProps {
  options: VariantOption[];
  selectedValue: string | undefined;
  onSelect: (value: string, option: VariantOption) => void;
  gstRate?: number | null;
  deliveryText?: string;
  className?: string;
}

export function VariantCardSelector({
  options,
  selectedValue,
  onSelect,
  gstRate = null,
  deliveryText = "FREE Delivery Tomorrow",
  className,
}: VariantCardSelectorProps) {
  const displayPriceIncl = (exclusive: number) => priceInclusiveOfGst(exclusive, gstRate);

  return (
    <div className={cn("flex gap-3 overflow-x-auto pb-2", className)}>
      {options.map((opt) => {
        const optDisabled = !opt.available || opt.stock === 0;
        const isSelected = selectedValue === opt.value;
        const thumbImg = opt.images?.[0];
        const price = opt.price != null ? displayPriceIncl(opt.price) : null;
        const compareAtPrice = opt.compareAtPrice != null ? displayPriceIncl(opt.compareAtPrice) : null;
        const hasDiscount = compareAtPrice != null && price != null && compareAtPrice > price;

        return (
          <button
            key={opt.value}
            disabled={optDisabled}
            onClick={() => !optDisabled && onSelect(opt.value, opt)}
            className={cn(
              "group relative flex flex-col min-w-[140px] max-w-[160px] rounded-lg border-2 transition-all bg-white hover:shadow-md",
              optDisabled && "opacity-50 cursor-not-allowed",
              isSelected
                ? "border-primary-500 ring-2 ring-primary-500/20 shadow-md"
                : "border-border hover:border-gray-300",
            )}
          >
            {/* Image Section */}
            <div className="relative w-full aspect-square rounded-t-lg overflow-hidden bg-gray-50">
              {thumbImg ? (
                <Image
                  src={thumbImg}
                  alt={opt.label}
                  fill
                  sizes="160px"
                  className={cn(
                    "object-contain p-2",
                    optDisabled && "grayscale opacity-60"
                  )}
                />
              ) : opt.hex ? (
                <div className="flex h-full items-center justify-center">
                  <span
                    className="h-16 w-16 rounded-full border-2 border-gray-200 shadow-inner"
                    style={{ background: opt.hex }}
                  />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-2xl font-bold text-gray-300">{opt.label.slice(0, 2)}</span>
                </div>
              )}
              
              {/* Selected Checkmark */}
              {isSelected && (
                <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center shadow-lg">
                  <Check size={14} className="text-white" strokeWidth={3} />
                </div>
              )}

              {/* Sold Out Overlay */}
              {opt.stock === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[2px]">
                  <span className="text-xs font-bold text-danger-600 bg-white px-2 py-1 rounded shadow-sm">
                    Temporarily out of stock
                  </span>
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="flex flex-col p-3 gap-1.5 text-left border-t border-border/50">
              {/* Variant Label */}
              <p className={cn(
                "text-xs font-medium truncate",
                isSelected ? "text-primary-700" : "text-text-secondary"
              )}>
                {opt.label}
              </p>

              {/* Price Section */}
              {price != null && (
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[10px] text-text-muted">₹</span>
                    <span className="text-sm font-bold text-text-primary">
                      {price.toLocaleString("en-IN")}
                    </span>
                  </div>
                  
                  {hasDiscount && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-text-muted line-through">
                        ₹{compareAtPrice!.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] font-semibold text-danger-600">
                        {Math.round(((compareAtPrice! - price) / compareAtPrice!) * 100)}% off
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Delivery Info */}
              {!optDisabled && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Truck size={11} className="text-green-600 shrink-0" />
                  <span className="text-[10px] font-medium text-green-600 truncate">
                    {deliveryText}
                  </span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
