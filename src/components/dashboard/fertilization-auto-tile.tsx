"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { IntervalForm } from "@/components/fertilization/fertilization-card";
import { PicDosing } from "@/components/icons/pictos";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status";
import { useFertilizationSchedule, useStopFertilization } from "@/lib/api/queries";
import { useCanWrite } from "@/lib/auth/use-session";
import { cn } from "@/lib/cn";
import { dueLabel, fertilizationErrorMessage, scheduleState } from "@/lib/fertilization";
import { useNow } from "@/lib/use-now";

/** Saklar "Pupuk otomatis" di Beranda: nyala = atur jarak hari (PUT), mati = hentikan (DELETE). Sama seperti kartu di /jadwal-siram. */
export function FertilizationAutoTile({ className }: { className?: string }) {
  const q = useFertilizationSchedule();
  const stop = useStopFertilization();
  const canWrite = useCanWrite();
  const now = useNow();
  const [dialog, setDialog] = useState<"on" | "off" | null>(null);

  const s = q.data;
  const state = s ? scheduleState(s) : null;
  const on = state?.kind === "active";
  const switchable = state?.kind === "active" || state?.kind === "no-schedule";

  const status = !s
    ? q.error
      ? "Jadwal pupuk belum bisa dimuat"
      : null
    : s.activeRun
      ? "Sedang memupuk"
      : state?.kind === "active"
        ? `Menyala · setiap ${state.intervalDays} hari${s.nextDueDate ? ` · berikutnya ${dueLabel(s.nextDueDate, now || undefined)}` : ""}`
        : state?.kind === "no-schedule"
          ? "Mati · jadwal pupuk belum diatur"
          : state?.kind === "disabled"
            ? "Mati · dimatikan di pengaturan sistem"
            : state?.kind === "ai-not-configured"
              ? "Belum bisa dipakai · AI belum diatur"
              : "Belum bisa dibaca · AI tidak menjawab";

  const close = () => {
    if (stop.isPending) return;
    stop.reset();
    setDialog(null);
  };

  return (
    <div className={cn("flex w-full min-w-0 flex-col rounded-[16px] bg-card p-3 ring-1 ring-line", className)}>
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-card-2 ring-1 ring-line">
          <PicDosing className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-5 font-semibold text-ink">Pupuk otomatis</p>
          <p className="text-xs text-ink-2">Pada hari pupuk, pupuk N, P, K dituang ke drum sebelum jam siram pertama; takarannya dari AI atau Anda atur sendiri.</p>
          {status ? (
            <p className={cn("mt-0.5 flex items-start gap-1.5 text-xs", on || s?.activeRun ? "font-medium text-accent-ink" : "text-muted")}>
              <StatusDot tone={on || s?.activeRun ? "ok" : "neutral"} pulse={!!(on || s?.activeRun)} className="mt-1 size-1.5" />
              <span>{status}</span>
            </p>
          ) : (
            <Skeleton className="mt-1 h-3 w-40" />
          )}
        </div>
        {canWrite && switchable && (
          <Switch checked={on} label={on ? "Matikan pupuk otomatis" : "Nyalakan pupuk otomatis"} onChange={() => setDialog(on ? "off" : "on")} />
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 border-t border-dashed border-line pt-2.5 text-xs text-muted">
        <Link href="/jadwal-siram" className="inline-flex items-center gap-0.5 font-semibold text-accent-ink hover:underline">
          Atur jadwal pupuk <ChevronRight aria-hidden className="size-3.5" />
        </Link>
      </div>

      <Dialog open={dialog === "on"} onClose={() => setDialog(null)} title="Nyalakan pupuk otomatis">
        <p className="mb-3 text-sm text-ink-2">Pilih setiap berapa hari tanaman dipupuk. Pupuk hanya dituang bila ada jam siram yang menyala.</p>
        {dialog === "on" && <IntervalForm initial={s?.intervalDays ?? null} onDone={() => setDialog(null)} />}
      </Dialog>

      <ConfirmDialog
        open={dialog === "off"}
        onClose={close}
        onConfirm={() => stop.mutate(undefined, { onSuccess: () => setDialog(null) })}
        pending={stop.isPending}
        error={stop.error ? fertilizationErrorMessage(stop.error) : null}
        title="Matikan pupuk otomatis?"
        confirmLabel="Matikan"
      >
        <p>Siram otomatis tetap berjalan, tetapi tidak didahului pupuk lagi sampai pupuk otomatis dinyalakan kembali.</p>
      </ConfirmDialog>
    </div>
  );
}
