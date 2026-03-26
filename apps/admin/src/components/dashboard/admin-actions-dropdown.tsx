'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { cn } from '@xelnova/utils';

export interface AdminActionItem {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function positionMenu(trigger: DOMRect, menu: HTMLDivElement) {
  const mh = menu.offsetHeight;
  const mw = menu.offsetWidth;
  let top = trigger.bottom + 4;
  if (top + mh > window.innerHeight - 8) {
    top = trigger.top - mh - 4;
  }
  top = Math.max(8, Math.min(top, window.innerHeight - mh - 8));
  let left = trigger.right - mw;
  left = Math.max(8, Math.min(left, window.innerWidth - mw - 8));
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
}

export function AdminActionsDropdown({ items, ariaLabel = 'Row actions' }: { items: AdminActionItem[]; ariaLabel?: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const btn = triggerRef.current;
    const menu = menuRef.current;
    if (!btn || !menu) return;
    const br = btn.getBoundingClientRect();
    positionMenu(br, menu);
    requestAnimationFrame(() => {
      if (triggerRef.current && menuRef.current) {
        positionMenu(triggerRef.current.getBoundingClientRect(), menuRef.current);
      }
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => {
      const btn = triggerRef.current;
      const menu = menuRef.current;
      if (!btn || !menu) return;
      positionMenu(btn.getBoundingClientRect(), menu);
    };
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const menu =
    open && typeof document !== 'undefined' ? (
      <div
        ref={menuRef}
        role="menu"
        className="fixed z-[200] min-w-[10rem] rounded-xl border border-border bg-surface py-1 shadow-lg"
      >
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              setOpen(false);
              item.onClick();
            }}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
              item.disabled
                ? 'cursor-not-allowed text-text-muted opacity-50'
                : item.danger
                  ? 'text-danger-600 hover:bg-danger-50'
                  : 'text-text-primary hover:bg-surface-muted',
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <>
      <div className="relative inline-flex">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-1.5 text-text-muted hover:bg-surface-muted hover:text-text-primary"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={ariaLabel}
        >
          <MoreVertical size={16} />
        </button>
      </div>
      {menu && createPortal(menu, document.body)}
    </>
  );
}
