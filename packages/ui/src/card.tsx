"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@xelnova/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingStyles = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hoverable = false, padding = "md", className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border border-dark-300 bg-dark-100 shadow-card-dark transition-all duration-300",
          hoverable &&
            "hover:shadow-card-dark-hover hover:border-dark-400 hover:-translate-y-0.5",
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
