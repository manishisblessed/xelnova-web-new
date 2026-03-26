"use client";

import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@xelnova/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "relative w-full rounded-2xl border border-border bg-surface p-6 shadow-xl",
              sizeStyles[size],
              className
            )}
          >
            {title && (
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {!title && (
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary"
              >
                <X size={18} />
              </button>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
