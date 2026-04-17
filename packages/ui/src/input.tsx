"use client";

import {
  forwardRef,
  useState,
  useCallback,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@xelnova/utils";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  endIcon?: ReactNode;
  /**
   * Hint shown beneath the input. Use this instead of placeholders when the
   * field needs a longer explanation that should always remain visible.
   */
  hint?: ReactNode;
  /**
   * When true, renders the label as a regular block above the input instead
   * of using the floating-label pattern. Use this in dense forms (like
   * "Add product") where floating labels can clip or feel cramped.
   */
  stackedLabel?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      icon,
      endIcon,
      hint,
      stackedLabel,
      className,
      id,
      value,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      required,
      ...props
    },
    ref,
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const hasValue = value !== undefined && value !== "";
    const [focused, setFocused] = useState(false);
    const floated = focused || hasValue || (defaultValue !== undefined && defaultValue !== "");

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(true);
        onFocus?.(e);
      },
      [onFocus]
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(false);
        onBlur?.(e);
      },
      [onBlur]
    );

    if (stackedLabel) {
      return (
        <div className="w-full">
          {label && (
            <label
              htmlFor={inputId}
              className={cn(
                "mb-1.5 block text-xs font-semibold uppercase tracking-wide",
                error ? "text-danger-500" : "text-text-secondary",
              )}
            >
              {label}
              {required && <span className="ml-0.5 text-danger-500">*</span>}
            </label>
          )}
          <div className="relative">
            {icon && (
              <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-500">
                {icon}
              </div>
            )}
            <input
              ref={ref}
              id={inputId}
              value={value}
              defaultValue={defaultValue}
              onChange={onChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              required={required}
              className={cn(
                "w-full rounded-xl border bg-surface px-4 py-2.5 text-sm text-text-primary outline-none transition-all duration-200",
                "border-border focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                icon && "pl-11",
                endIcon && "pr-11",
                error &&
                  "border-danger-500 focus:border-danger-500 focus:ring-danger-500/30",
                className,
              )}
              {...props}
            />
            {endIcon && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                {endIcon}
              </div>
            )}
          </div>
          {error ? (
            <p className="mt-1.5 text-xs text-danger-400">{error}</p>
          ) : hint ? (
            <p className="mt-1 text-xs text-text-muted">{hint}</p>
          ) : null}
        </div>
      );
    }

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
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            required={required}
            placeholder={label && floated ? props.placeholder : label ? " " : props.placeholder}
            className={cn(
              "peer w-full rounded-xl border bg-surface px-4 py-3 text-sm text-text-primary outline-none transition-all duration-200",
              label && !floated && "placeholder-transparent",
              "border-border focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              icon && "pl-11",
              endIcon && "pr-11",
              error &&
                "border-danger-500 focus:border-danger-500 focus:ring-danger-500/30",
              className
            )}
            {...props}
          />
          {label && (
            <label
              htmlFor={inputId}
              className={cn(
                "absolute text-text-muted transition-all duration-200 pointer-events-none overflow-hidden text-ellipsis whitespace-nowrap",
                floated
                  ? "top-0 -translate-y-1/2 text-xs bg-surface px-1.5 rounded"
                  : "top-1/2 -translate-y-1/2 text-sm",
                floated ? (icon ? "left-10" : "left-3") : (icon ? "left-11" : "left-4"),
                floated
                  ? (icon ? "max-w-[calc(100%-3.25rem)]" : "max-w-[calc(100%-1.5rem)]")
                  : (icon ? "max-w-[calc(100%-4rem)]" : "max-w-[calc(100%-2rem)]"),
                floated && focused && "text-primary-500",
                error && focused && "text-danger-500"
              )}
            >
              {label}
            </label>
          )}
          {endIcon && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted">
              {endIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="mt-1.5 text-xs text-danger-400">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-text-muted">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
