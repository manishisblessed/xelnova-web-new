"use client";

import { Star, StarHalf } from "lucide-react";
import { cn } from "@xelnova/utils";

export interface RatingProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  count?: number;
  showValue?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 14,
  md: 18,
  lg: 22,
};

export function Rating({
  value,
  max = 5,
  size = "md",
  count,
  showValue = false,
  className,
}: RatingProps) {
  const iconSize = sizeMap[size];
  const fullStars = Math.floor(value);
  const hasHalf = value - fullStars >= 0.5;
  const emptyStars = max - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <div className="flex items-center">
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            size={iconSize}
            className="fill-primary-500 text-primary-500"
          />
        ))}
        {hasHalf && (
          <div className="relative">
            <Star size={iconSize} className="text-dark-400" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star
                size={iconSize}
                className="fill-primary-500 text-primary-500"
              />
            </div>
          </div>
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            size={iconSize}
            className="text-dark-400"
          />
        ))}
      </div>
      {showValue && (
        <span className="text-sm font-medium text-secondary-300">
          {value.toFixed(1)}
        </span>
      )}
      {count !== undefined && (
        <span className="text-sm text-secondary-500">({count})</span>
      )}
    </div>
  );
}
