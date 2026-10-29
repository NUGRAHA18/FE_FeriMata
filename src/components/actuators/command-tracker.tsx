"use client";

import { AlertTriangle, CheckCircle2, CircleMinus, Loader2, XCircle } from "lucide-react";
import { useTrackedCommand } from "@/lib/api/queries";
import { commandSummary } from "@/lib/actuator-commands";
import { ACK_WARNING_MS, commandStatusText, describeCommandFailure, isNoResponse } from "@/lib/actuator-safety";
import { commandStatusLabel, formatDuration, formatTime } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/cn";

export type TrackedCommand = { uid: string; sentAtLocal: number };

/**
 * Status perintah yang dilacak: 202 hanya berarti "terkirim". Menunggu event
 * ACTUATOR_COMMAND_UPDATED dengan commandUid yang sama sampai EXECUTED / FAILED.
 * Tanpa jawaban ±30 dtk → peringatan (tidak pernah dianggap berhasil).
 */
export function CommandTracker({ tracked, className }: { tracked: TrackedCommand; className?: string }) {
  const cmd = useTrackedCommand(tracked.uid);
  const now = useNow();
  if (!cmd) return null;
  const waiting = cmd.status === "SENT" || cmd.status === "PENDING";
  const elapsed = now ? now - tracked.sentAtLocal : 0;
  const late = waiting && elapsed > ACK_WARNING_MS;
  const duration = typeof cmd.parameters?.durationSeconds === "number" ? cmd.parameters.durationSeconds : null;
  const failure = cmd.status === "FAILED" ? describeCommandFailure(cmd) : null;
  // Tidak dijawab ≠ ditolak: hasilnya tidak diketahui, jadi kuning (periksa alat), bukan merah.
  const noResponse = isNoResponse(cmd);

  const tone =
    cmd.status === "EXECUTED"
      ? "bg-accent-soft text-accent-ink"
      : noResponse || late
        ? "bg-warn-soft text-warn-ink"
        : cmd.status === "FAILED"
          ? "bg-danger-soft text-danger-ink"
          : "bg-card-2 text-ink-2";
  const Icon = cmd.status === "EXECUTED" ? CheckCircle2 : noResponse ? AlertTriangle : cmd.status === "FAILED" ? XCircle : cmd.status === "CANCELLED" ? CircleMinus : late ? AlertTriangle : Loader2;

  return (
    <div role="status" aria-live="polite" className={cn("flex items-start gap-2.5 rounded-inner px-3 py-2.5 text-sm", tone, className)}>
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", waiting && !late && "animate-spin")} strokeWidth={1.9} />
      <div className="min-w-0">
        <p className="font-medium">
          {commandSummary(cmd.commandType, cmd.parameters)}
          {duration != null && ` ${formatDuration(duration)}`} — {commandStatusText(cmd, commandStatusLabel)}
        </p>
        {late && <p className="mt-0.5 text-xs">Alat belum menjawab setelah {formatDuration(Math.round(elapsed / 1000))}. Periksa alat sebelum menganggap berhasil.</p>}
        {failure && (
          <p className="mt-0.5 text-xs" title={failure.detail ?? undefined}>
            {failure.message}
          </p>
        )}
        <p className="mt-0.5 text-xs opacity-70">{formatTime(cmd.executedAt ?? cmd.sentAt ?? cmd.requestedAt, true)} WIB</p>
      </div>
    </div>
  );
}
