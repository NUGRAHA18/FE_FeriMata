"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { PicSchedule } from "@/components/icons/pictos";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status";
import { errorMessage } from "@/lib/api/client";
import { useIrrigationSchedules, usePatchIrrigation } from "@/lib/api/queries";
import type { IrrigationSchedule } from "@/lib/api/types";
import { useCanWrite } from "@/lib/auth/use-session";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const timesOf = (list: IrrigationSchedule[]) => list.map((s) => s.time).join(", ");

/** Jadwal aktif yang paling dekat berjalan berikutnya (nextRunAt dari backend). */
function nextRun(list: IrrigationSchedule[]): string | null {
  const next = list
    .map((s) => s.nextRunAt)
    .filter((t): t is string => !!t)
    .sort()[0];
  return next ? formatTime(next) : null;
}

/** Saklar "Siram otomatis" = semua jadwal siram backend (IRRIGATION_SCHEDULE_ENABLED hanya variabel server, tak ada
 *  saklar global). Pupuk otomatis punya ubin sendiri (FertilizationAutoTile). */
export function AutoModeTile({ className }: { className?: string }) {
  const q = useIrrigationSchedules();
  const patch = usePatchIrrigation();
  const canWrite = useCanWrite();
  const [confirm, setConfirm] = useState<"on" | "off" | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = q.data ?? [];
  const active = list.filter((s) => s.enabled);
  const on = active.length > 0;
  const targets = confirm === "off" ? active : list.filter((s) => !s.enabled);

  const close = () => {
    if (pending) return;
    setConfirm(null);
    setError(null);
  };
  const apply = async () => {
    setPending(true);
    setError(null);
    const enabled = confirm === "on";
    const results = await Promise.allSettled(targets.map((s) => patch.mutateAsync({ id: s.id, body: { enabled } })));
    setPending(false);
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failed.length) setError(`${failed.length} dari ${targets.length} jadwal gagal diubah: ${errorMessage(failed[0].reason)}`);
    else setConfirm(null);
  };

  const status = q.isPending
    ? null
    : q.error
      ? "Jadwal siram belum bisa dimuat"
      : !list.length
        ? "Belum ada jadwal siram"
        : on
          ? `Menyala · ${active.length} dari ${list.length} jam siram aktif${nextRun(active) ? ` · berikutnya ${nextRun(active)}` : ""}`
          : `Mati · ${list.length} jam siram tidak aktif`;

  return (
    <div className={cn("flex w-full min-w-0 flex-col rounded-[16px] bg-card p-3 ring-1 ring-line", className)}>
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-card-2 ring-1 ring-line">
          <PicSchedule className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-5 font-semibold text-ink">Siram otomatis</p>
          <p className="text-xs text-ink-2">Pompa siram menyala sendiri pada jam siram, selama waktu yang diisi di jadwal.</p>
          {status ? (
            <p className={cn("mt-0.5 flex items-start gap-1.5 text-xs", on ? "font-medium text-accent-ink" : "text-muted")}>
              <StatusDot tone={on ? "ok" : "neutral"} pulse={on} className="mt-1 size-1.5" />
              <span>{status}</span>
            </p>
          ) : (
            <Skeleton className="mt-1 h-3 w-40" />
          )}
        </div>
        {canWrite &&
          (list.length ? (
            <Switch checked={on} label={on ? "Matikan siram otomatis" : "Nyalakan siram otomatis"} onChange={() => setConfirm(on ? "off" : "on")} />
          ) : (
            !q.isPending &&
            !q.error && (
              <Link href="/jadwal-siram" className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-[8px] px-1.5 text-[13px] font-semibold text-accent-ink hover:bg-accent-soft">
                Atur <ChevronRight aria-hidden className="size-4" />
              </Link>
            )
          ))}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 border-t border-dashed border-line pt-2.5 text-xs text-muted">
        <Link href="/jadwal-siram" className="inline-flex items-center gap-0.5 font-semibold text-accent-ink hover:underline">
          Atur jam siram <ChevronRight aria-hidden className="size-3.5" />
        </Link>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        onClose={close}
        onConfirm={apply}
        pending={pending}
        error={error}
        title={confirm === "off" ? "Matikan siram otomatis?" : "Nyalakan siram otomatis?"}
        confirmLabel={confirm === "off" ? "Matikan" : "Nyalakan"}
      >
        {confirm === "off" ? (
          <p>
            {active.length} jam siram ({timesOf(active)}) akan dimatikan. Pompa siram tidak menyala sendiri sampai siram otomatis dinyalakan lagi. Pupuk otomatis juga
            berhenti, karena pupuk hanya dituang sebelum jam siram.
          </p>
        ) : (
          <p>
            Semua jam siram ({timesOf(list)}) akan dinyalakan. Pompa siram menyala sendiri pada jam-jam itu. Penyiraman tetap dibatalkan bila tidak aman, misalnya listrik
            PLN padam atau air drum rendah.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
