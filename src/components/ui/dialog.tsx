"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type BaseProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Cegah tutup lewat Esc/klik latar (mis. selama request berjalan). */
  dismissible?: boolean;
};

/**
 * Dialog berbasis <dialog> native: showModal() memberi focus trap, Esc, dan inert
 * pada latar tanpa library tambahan.
 */
function useNativeDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return ref;
}

function Shell({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  dismissible = true,
  variant,
}: BaseProps & { variant: "modal" | "drawer" }) {
  const ref = useNativeDialog(open);
  const titleId = useId();
  const descId = useId();
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && dismissible) onClose();
      }}
      className={cn(
        "m-0 max-h-none max-w-none bg-transparent p-0 text-ink backdrop:bg-black/40 backdrop:backdrop-blur-[2px]",
        variant === "modal"
          ? "fixed inset-0 h-dvh w-screen place-items-end open:grid sm:place-items-center"
          : "fixed inset-0 h-dvh w-screen justify-end open:flex",
      )}
    >
      {open && (
        <div
          className={cn(
            "flex flex-col bg-card shadow-2xl",
            variant === "modal"
              ? "max-h-[92dvh] w-full rounded-t-[26px] sm:max-w-md sm:rounded-card"
              : "h-full w-full sm:w-[440px] sm:rounded-l-[26px]",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-medium text-ink">
                {title}
              </h2>
              {description && (
                <div id={descId} className="mt-1 text-sm text-muted">
                  {description}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={!dismissible}
              aria-label="Tutup"
              className="grid size-9 shrink-0 place-items-center rounded-control bg-card-2 text-ink-2 hover:bg-sunken focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
            >
              <X aria-hidden className="size-4" strokeWidth={1.8} />
            </button>
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
          {footer && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

export function Dialog(props: BaseProps) {
  return <Shell {...props} variant="modal" />;
}

export function Drawer(props: BaseProps) {
  return <Shell {...props} variant="drawer" />;
}
