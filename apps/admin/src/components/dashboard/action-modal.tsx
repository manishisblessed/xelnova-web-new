'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@xelnova/ui';

interface ActionModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onSubmit?: () => void;
  submitLabel?: string;
  submitVariant?: 'primary' | 'danger';
  loading?: boolean;
  wide?: boolean;
  /** When true, primary submit stays visible but is not clickable */
  submitDisabled?: boolean;
  /** Shown as native tooltip when submit is disabled */
  submitDisabledReason?: string;
}

export function ActionModal({
  open,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel = 'Save',
  submitVariant = 'primary',
  loading,
  wide,
  submitDisabled,
  submitDisabledReason,
}: ActionModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className={`bg-surface rounded-2xl border border-border shadow-elevated w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[85vh] flex flex-col`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-text-primary font-display">{title}</h2>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-muted text-text-muted"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">{children}</div>
            {onSubmit && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                <Button variant="ghost" onClick={onClose} size="sm">Cancel</Button>
                {submitVariant === 'danger' ? (
                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={!!loading}
                    className="inline-flex items-center justify-center rounded-lg bg-danger-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-danger-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Deleting...' : submitLabel}
                  </button>
                ) : (
                  <Button
                    variant={submitVariant}
                    onClick={onSubmit}
                    loading={loading}
                    size="sm"
                    disabled={!!submitDisabled}
                    title={submitDisabled ? submitDisabledReason : undefined}
                  >
                    {submitLabel}
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
