"use client";

import type { ReactNode } from "react";
import { Button } from "./button";
import { Dialog } from "./dialog";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  pending?: boolean;
  error?: string | null;
  tone?: "dark" | "danger";
};

export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel, pending, error, tone = "dark" }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} dismissible={!pending} title={title}>
      <div className="flex flex-col gap-4">
        {children && <div className="text-sm text-ink-2">{children}</div>}
        {error && (
          <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="soft" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={pending}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
