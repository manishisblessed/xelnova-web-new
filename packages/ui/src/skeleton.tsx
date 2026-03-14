"use client";

import { cn } from "@xelnova/utils";

type SkeletonShape = "rectangle" | "circle" | "text";

export interface SkeletonProps {
  shape?: SkeletonShape;
  width?: string | number;
  height?: string | number;
  className?: string;
  lines?: number;
}

export function Skeleton({
  shape = "rectangle",
  width,
  height,
  className,
  lines = 1,
}: SkeletonProps) {
  const baseStyles =
    "animate-shimmer bg-gradient-to-r from-dark-300 via-dark-400 to-dark-300 bg-[length:200%_100%] rounded";

  if (shape === "circle") {
    return (
      <div
        className={cn(baseStyles, "rounded-full", className)}
        style={{
          width: width || 40,
          height: height || width || 40,
        }}
      />
    );
  }

  if (shape === "text") {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseStyles, "h-4 rounded-md")}
            style={{
              width: i === lines - 1 && lines > 1 ? "75%" : width || "100%",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseStyles, "rounded-xl", className)}
      style={{ width: width || "100%", height: height || 200 }}
    />
  );
}
