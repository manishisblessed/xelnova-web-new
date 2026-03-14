"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@xelnova/utils";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  endIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, endIcon, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            placeholder={label ? " " : props.placeholder}
            className={cn(
              "peer w-full rounded-xl border bg-dark-200 px-4 py-3 text-sm text-white placeholder-transparent outline-none transition-all duration-200",
              "border-dark-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              icon && "pl-11",
              endIcon && "pr-11",
              error && "border-danger-500 focus:border-danger-500 focus:ring-danger-500/30",
              className
            )}
            {...props}
          />
          {label && (
            <label
              htmlFor={inputId}
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 text-sm text-secondary-500 transition-all duration-200 pointer-events-none",
                "peer-focus:top-0 peer-focus:text-xs peer-focus:bg-dark-200 peer-focus:px-1.5 peer-focus:text-primary-500",
                "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-dark-200 peer-[:not(:placeholder-shown)]:px-1.5",
                icon && "left-11",
                error && "peer-focus:text-danger-500"
              )}
            >
              {label}
            </label>
          )}
          {endIcon && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary-500">
              {endIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-danger-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
