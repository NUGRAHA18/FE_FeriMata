"use client";

import { ArrowUpRight, Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import { StatusDot } from "@/components/ui/status";
import { useShell, type ConnectionState } from "./shell-context";

const connectionText: Record<ConnectionState, string> = {
  connected: "Data langsung dari greenhouse",
  connecting: "Menyambungkan…",
  disconnected: "Koneksi terputus — angka mungkin sudah lama",
};

const connectionShort: Record<ConnectionState, string> = {
  connected: "Langsung",
  connecting: "Menyambung",
  disconnected: "Terputus",
};

export function ConnectionIndicator({ state, compact }: { state: ConnectionState; compact?: boolean }) {
  const tone = state === "connected" ? "ok" : state === "connecting" ? "neutral" : "warn";
  return (
    <span
      role="status"
      title={connectionText[state]}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full text-sm whitespace-nowrap text-ink-2",
        compact ? "px-0" : "h-10 bg-card px-3.5 font-medium text-ink shadow-card ring-1 ring-line",
      )}
    >
      <StatusDot tone={tone} pulse={state !== "connected"} />
      <span className={cn(compact && "sr-only")}>{connectionShort[state]}</span>
    </span>
  );
}

/** Pill "N Peringatan ↗" — membuka daftar peringatan yang belum ditangani. */
export function AlertPill({ count }: { count: number }) {
  const { openAlertDrawer } = useShell();
  return (
    <button
      type="button"
      onClick={openAlertDrawer}
      aria-label={`${count} peringatan belum ditangani — buka daftar peringatan`}
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-card pr-3.5 pl-3.5 text-sm font-medium whitespace-nowrap text-ink shadow-card ring-1 ring-line sm:pr-2 transition hover:bg-card-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className="relative">
        <Bell aria-hidden className="size-[18px] text-ink-2" strokeWidth={1.8} />
        {count > 0 && <span aria-hidden className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-danger ring-2 ring-card" />}
      </span>
      <span className="tabular">{count} Peringatan</span>
      <span className="hidden size-6 place-items-center rounded-[12px] bg-accent-soft text-accent-ink sm:grid">
        <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={1.8} />
      </span>
    </button>
  );
}
