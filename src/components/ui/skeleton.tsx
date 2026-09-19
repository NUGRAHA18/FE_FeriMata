import type { ReactNode } from "react";
import { AlertCircle, Inbox, RotateCw } from "lucide-react";
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-sunken/80", className)} />;
}

/** Keadaan kosong dan error yang bergaya sama untuk semua kartu. */
export function EmptyState({ title, hint, icon, className }: { title: string; hint?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-1.5 rounded-inner bg-card-2 px-4 py-6 text-center", className)}>
      {icon ?? <Inbox aria-hidden className="size-5 text-muted" strokeWidth={1.6} />}
      <p className="text-sm font-medium text-ink-2">{title}</p>
      {hint && <p className="max-w-xs text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center gap-2 rounded-inner bg-danger-soft px-4 py-5 text-center", className)}
    >
      <AlertCircle aria-hidden className="size-5 text-danger" strokeWidth={1.6} />
      <p className="text-sm text-danger-ink">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg bg-card-2 px-3 py-1.5 text-xs font-medium text-ink hover:bg-card"
        >
          <RotateCw aria-hidden className="size-3.5" /> Coba lagi
        </button>
      )}
    </div>
  );
}
