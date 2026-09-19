"use client";

import { ArrowUpRight, Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import { StatusDot } from "@/components/ui/status";
import { useShell, type ConnectionState } from "./shell-context";

const connectionText: Record<ConnectionState, string> = {
  connected: "Realtime tersambung",
  connecting: "Menyambungkan…",
  disconnected: "Realtime terputus — data mungkin tidak terkini",
};

export function ConnectionIndicator({ state, compact }: { state: ConnectionState; compact?: boolean }) {
  const tone = state === "connected" ? "ok" : state === "connecting" ? "neutral" : "warn";
  return (
    <span
      role="status"
      title={connectionText[state]}
      className={cn(
        "inline-flex items-center gap-2 rounded-full text-xs text-ink-2",
        compact ? "px-0" : "bg-card px-3 py-2",
      )}
    >
      <StatusDot tone={tone} pulse={state !== "connected"} />
      <span className={cn(compact && "sr-only")}>{state === "connected" ? "Live" : state === "connecting" ? "Menyambung" : "Terputus"}</span>
    </span>
  );
}

/** Pill hitam "N Alert ↗" — membuka drawer alert. */
export function AlertPill({ count }: { count: number }) {
  const { openAlertDrawer } = useShell();
  return (
    <button
      type="button"
      onClick={openAlertDrawer}
      aria-label={`${count} alert belum ditangani — buka daftar alert`}
      className="inline-flex h-10 items-center gap-2 rounded-control bg-active pr-2 pl-3 text-sm font-medium text-active-fg transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className="relative">
        <Bell aria-hidden className="size-4" strokeWidth={1.8} />
        {count > 0 && <span aria-hidden className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-danger" />}
      </span>
      <span className="tabular">{count} Alert</span>
      <span className="grid size-6 place-items-center rounded-md bg-white/10">
        <ArrowUpRight aria-hidden className="size-3.5" strokeWidth={1.8} />
      </span>
    </button>
  );
}
