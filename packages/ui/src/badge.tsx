"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@xelnova/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-secondary-700 text-secondary-200",
  success: "bg-accent-500/15 text-accent-400 border border-accent-500/20",
  warning: "bg-primary-500/15 text-primary-400 border border-primary-500/20",
  danger: "bg-danger-500/15 text-danger-400 border border-danger-500/20",
  info: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
};

export function Badge({
  variant = "default",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
