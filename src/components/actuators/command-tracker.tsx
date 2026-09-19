"use client";

import { AlertTriangle, CheckCircle2, CircleMinus, Loader2, XCircle } from "lucide-react";
import { useTrackedCommand } from "@/lib/api/queries";
import { ACK_WARNING_MS } from "@/lib/actuator-safety";
import { commandStatusLabel, formatDuration, formatTime } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/cn";

export type TrackedCommand = { uid: string; sentAtLocal: number };

/**
 * Status perintah yang dilacak: 202 hanya berarti "terkirim ke broker". Menunggu event
 * ACTUATOR_COMMAND_UPDATED dengan commandUid yang sama sampai EXECUTED / FAILED.
 * Tanpa konfirmasi ±30 dtk → peringatan (tidak pernah dianggap berhasil).
 */
export function CommandTracker({ tracked, className }: { tracked: TrackedCommand; className?: string }) {
  const cmd = useTrackedCommand(tracked.uid);
  const now = useNow();
  if (!cmd) return null;
  const waiting = cmd.status === "SENT" || cmd.status === "PENDING";
  const elapsed = now ? now - tracked.sentAtLocal : 0;
  const late = waiting && elapsed > ACK_WARNING_MS;
  const duration = typeof cmd.parameters?.durationSeconds === "number" ? cmd.parameters.durationSeconds : null;

  const tone =
    cmd.status === "EXECUTED" ? "bg-accent-soft text-accent" : cmd.status === "FAILED" ? "bg-danger-soft text-danger-ink" : late ? "bg-warn-soft text-warn-ink" : "bg-card-2 text-ink-2";
  const Icon = cmd.status === "EXECUTED" ? CheckCircle2 : cmd.status === "FAILED" ? XCircle : cmd.status === "CANCELLED" ? CircleMinus : late ? AlertTriangle : Loader2;

  return (
    <div role="status" aria-live="polite" className={cn("flex items-start gap-2.5 rounded-inner px-3 py-2.5 text-sm", tone, className)}>
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", waiting && !late && "animate-spin")} strokeWidth={1.9} />
      <div className="min-w-0">
        <p className="font-medium">
          {cmd.commandType}
          {duration != null && ` · ${formatDuration(duration)}`} — {commandStatusLabel[cmd.status] ?? cmd.status}
        </p>
        {late && <p className="mt-0.5 text-xs">Belum ada konfirmasi dari perangkat setelah {formatDuration(Math.round(elapsed / 1000))}. Jangan anggap berhasil.</p>}
        {cmd.status === "FAILED" && cmd.errorMessage && <p className="mt-0.5 text-xs">{cmd.errorMessage}</p>}
        <p className="mt-0.5 font-mono text-[11px] opacity-70">
          {cmd.commandUid} · {formatTime(cmd.executedAt ?? cmd.sentAt ?? cmd.requestedAt, true)}
        </p>
      </div>
    </div>
  );
}
