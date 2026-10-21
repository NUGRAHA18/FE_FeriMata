import type { ReactNode } from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { SproutArt } from "@/components/illustrations";
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-sunken/80", className)} />;
}

/** Keadaan kosong dan error yang bergaya sama untuk semua kartu. */
export function EmptyState({ title, hint, icon, className }: { title: string; hint?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-1.5 rounded-inner bg-gradient-to-b from-accent-soft/50 to-card-2 px-4 py-6 text-center ring-1 ring-line", className)}>
      {icon ? (
        <span className="mb-1 grid size-10 place-items-center rounded-full bg-card text-accent shadow-card ring-1 ring-line">{icon}</span>
      ) : (
        <SproutArt className="mb-1 h-9 w-16" />
      )}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-xs text-xs text-ink-2">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center gap-2 rounded-inner bg-danger-soft px-4 py-5 text-center ring-1 ring-danger/15", className)}
    >
      <AlertCircle aria-hidden className="size-5 text-danger" strokeWidth={2} />
      <p className="text-sm text-danger-ink">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-xs font-medium text-ink ring-1 ring-line hover:bg-card-2"
        >
          <RotateCw aria-hidden className="size-3.5" /> Coba lagi
        </button>
      )}
    </div>
  );
}
