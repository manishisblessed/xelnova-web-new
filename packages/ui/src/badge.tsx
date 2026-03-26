"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@xelnova/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-50 text-gray-600 border border-gray-200/80",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
  warning: "bg-amber-50 text-amber-700 border border-amber-200/80",
  danger: "bg-red-50 text-red-700 border border-red-200/80",
  info: "bg-blue-50 text-blue-700 border border-blue-200/80",
};

const dotStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
};

export function Badge({
  variant = "default",
  dot = true,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotStyles[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
