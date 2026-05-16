"use client";

import Image from "next/image";
import { Check, Truck } from "lucide-react";
import { cn, priceInclusiveOfGst } from "@xelnova/utils";

interface VariantOption {
  value: string;
  label: string;
  available: boolean;
  images?: string[];
  price?: number;
  compareAtPrice?: number;
  stock?: number;
  hex?: string;
  onHover?: () => void;
}

interface VariantCardSelectorProps {
  options: VariantOption[];
  selectedValue: string | undefined;
  onSelect: (value: string, option: VariantOption) => void;
  gstRate?: number | null;
  /**
   * Free-form delivery label rendered under the price block. Keep it short
   * (≤ ~26 chars) so it doesn't truncate. Parent should already have the
   * computed delivery date — pass e.g. `FREE by Thu, 21 May`.
   */
  deliveryText?: string;
  className?: string;
}

/**
 * Rich variant card — combines an Amazon-style swatch with the full
 * fulfillment context (label, price, MRP, discount %, delivery, selection
 * state). Each card is a single tappable button so the entire surface meets
 * the 44px touch target rule and screen-readers get one logical control per
 * variant.
 */
export function VariantCardSelector({
  options,
  selectedValue,
  onSelect,
  gstRate = null,
  deliveryText = "FREE Delivery Tomorrow",
  className,
}: VariantCardSelectorProps) {
  const displayPriceIncl = (exclusive: number) =>
    priceInclusiveOfGst(exclusive, gstRate);

  return (
    <div
      role="radiogroup"
      aria-label="Select variant"
      className={cn(
        "flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scroll-smooth",
        className,
      )}
    >
      {options.map((opt, i) => {
        const optDisabled = !opt.available || opt.stock === 0;
        const isSelected = selectedValue === opt.value;
        const thumbImg = opt.images?.[0];
        const price = opt.price != null ? displayPriceIncl(opt.price) : null;
        const mrp =
          opt.compareAtPrice != null
            ? displayPriceIncl(opt.compareAtPrice)
            : null;
        const hasDiscount = mrp != null && price != null && mrp > price;
        const discountPct = hasDiscount
          ? Math.round(((mrp! - price!) / mrp!) * 100)
          : 0;
        const isLowStock =
          opt.stock != null && opt.stock > 0 && opt.stock <= 5;

        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${opt.label}${price != null ? `, ₹${price.toLocaleString("en-IN")}` : ""}${
              hasDiscount ? `, ${discountPct}% off` : ""
            }${optDisabled ? ", out of stock" : ""}`}
            disabled={optDisabled}
            onMouseEnter={opt.onHover}
            onFocus={opt.onHover}
            onClick={() => !optDisabled && onSelect(opt.value, opt)}
            className={cn(
              "group relative flex w-[144px] shrink-0 snap-start flex-col overflow-hidden rounded-lg border-2 bg-white text-left transition-all duration-150",
              "hover:-translate-y-0.5 hover:shadow-md",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
              optDisabled &&
                "opacity-60 cursor-not-allowed hover:translate-y-0 hover:shadow-none",
              isSelected
                ? "border-primary-500 ring-2 ring-primary-500/20 shadow-sm"
                : "border-border hover:border-gray-300",
            )}
          >
            {/* Image / swatch */}
            <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
              {thumbImg ? (
                <Image
                  src={thumbImg}
                  alt={opt.label}
                  fill
                  sizes="144px"
                  priority={i === 0}
                  className={cn(
                    "object-contain p-2 transition-transform duration-200 group-hover:scale-105",
                    optDisabled && "grayscale",
                  )}
                />
              ) : opt.hex ? (
                <div className="flex h-full items-center justify-center">
                  <span
                    className="h-16 w-16 rounded-full border border-gray-200 shadow-inner"
                    style={{ background: opt.hex }}
                  />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-2xl font-bold text-gray-300">
                    {opt.label.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}

              {hasDiscount && !optDisabled && (
                <span className="absolute left-1.5 top-1.5 rounded-md bg-green-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
                  {discountPct}% OFF
                </span>
              )}

              {isSelected && (
                <span
                  aria-hidden
                  className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 shadow-sm ring-2 ring-white"
                >
                  <Check size={12} strokeWidth={3} className="text-white" />
                </span>
              )}

              {opt.stock === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-[1px]">
                  <span className="rounded bg-white px-2 py-0.5 text-[10px] font-bold text-danger-600 shadow">
                    Out of stock
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex flex-col gap-0.5 px-2 pt-1.5 pb-2">
              <p
                className={cn(
                  "truncate text-[13px] font-semibold leading-tight",
                  isSelected ? "text-primary-700" : "text-text-primary",
                )}
                title={opt.label}
              >
                {opt.label}
              </p>

              {price != null && (
                <>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[10px] font-medium text-text-primary">
                      ₹
                    </span>
                    <span className="text-[15px] font-bold leading-none text-text-primary">
                      {price.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {hasDiscount && (
                    <div className="flex items-center gap-1 text-[10px] leading-tight">
                      <span className="text-text-muted line-through">
                        ₹{mrp!.toLocaleString("en-IN")}
                      </span>
                      <span className="font-semibold text-green-700">
                        {discountPct}% off
                      </span>
                    </div>
                  )}
                </>
              )}

              {!optDisabled && (
                <div className="mt-1 flex items-center gap-1 border-t border-border/60 pt-1">
                  <Truck size={11} className="shrink-0 text-green-600" />
                  <span className="truncate text-[10px] font-medium text-green-700">
                    {deliveryText}
                  </span>
                </div>
              )}

              {isLowStock && !optDisabled && (
                <span className="mt-0.5 inline-flex w-fit rounded bg-amber-50 px-1 py-0.5 text-[9px] font-semibold text-amber-700">
                  Only {opt.stock} left
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
