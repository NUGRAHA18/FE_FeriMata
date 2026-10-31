"use client";

import Link from "next/link";
import { ChevronRight, Home, MapPin, Play, Power, RotateCcw, Square, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { ActuatorPicto } from "@/components/icons/pictos";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/input";
import { Badge, StatusDot } from "@/components/ui/status";
import { RelativeTime } from "@/components/ui/time";
import { commandSpecsFor, isSequenceActuator, type CommandSpec } from "@/lib/actuator-commands";
import { reportedStateLabel } from "@/lib/actuator-safety";
import { errorMessage } from "@/lib/api/client";
import { usePatchActuator } from "@/lib/api/queries";
import type { Actuator } from "@/lib/api/types";
import { useCanWrite } from "@/lib/auth/use-session";
import { actuatorTypeLabel, formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CommandDialog } from "./command-dialog";
import { CommandTracker, type TrackedCommand } from "./command-tracker";

export function ReportedState({
  actuator: a,
  large,
}: {
  actuator: Pick<Actuator, "currentState" | "stateUpdatedAt"> & Partial<Pick<Actuator, "type" | "supportedCommands">>;
  large?: boolean;
}) {
  const on = a.currentState?.toUpperCase() === "ON";
  const tone = a.currentState == null ? "neutral" : on ? "ok" : "neutral";
  return (
    <div>
      <p className={cn("flex items-center gap-2 font-semibold text-ink", large ? "text-2xl" : "text-base")}>
        <StatusDot tone={tone} pulse={on} className={large ? "size-3" : "size-2.5"} />
        {reportedStateLabel(a.currentState, isSequenceActuator(a))}
      </p>
      <p className="mt-0.5 text-xs text-muted">
        {a.stateUpdatedAt ? <RelativeTime iso={a.stateUpdatedAt} prefix="dilaporkan alat " /> : "alat belum melaporkan status"}
      </p>
    </div>
  );
}

const startIcons: Record<string, LucideIcon> = { ON: Power, START: Play, HOME: Home, GOTO_STATION: MapPin };

export const isOnState = (a: Pick<Actuator, "currentState">) => a.currentState?.toUpperCase() === "ON";

/** Aktuator dua keadaan (relay Nyalakan/Matikan, patroli Mulai/Hentikan) pakai switch; lainnya
 * (mis. pindah stasiun) tetap tombol. Null = bukan dua keadaan. */
export function switchSpecs(a: Parameters<typeof commandSpecsFor>[0]): { start: CommandSpec; stop: CommandSpec } | null {
  const specs = commandSpecsFor(a);
  const starts = specs.filter((s) => !s.stop);
  const stops = specs.filter((s) => s.stop);
  return starts.length === 1 && stops.length === 1 && starts[0].params !== "station" ? { start: starts[0], stop: stops[0] } : null;
}

/** Switch aktuator: posisi = status yang DILAPORKAN alat; menekan hanya membuka konfirmasi perintah.
 * Mematikan selalu boleh, menyalakan tidak bila alat dinonaktifkan. Null untuk Pelihat/bukan dua keadaan. */
export function ActuatorSwitch({ actuator: a, name, onCommand }: { actuator: Actuator; name?: string; onCommand: (command: string) => void }) {
  const canWrite = useCanWrite();
  const sw = switchSpecs(a);
  if (!canWrite || !sw) return null;
  const on = isOnState(a);
  if (!a.enabled && !on) return <Badge tone="warn">Nonaktif</Badge>;
  const next = on ? sw.stop : sw.start;
  return <Switch checked={on} label={`${next.label} ${name ?? a.name}`} onChange={() => onCommand(next.command)} />;
}

/** Dialog perintah + pelacak perintah terakhir + konfirmasi "Aktifkan lagi" untuk satu aktuator. */
function useCommandFlow(a: Actuator) {
  const [dialog, setDialog] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState("OFF");
  const [confirmEnable, setConfirmEnable] = useState(false);
  const [tracked, setTracked] = useState<TrackedCommand | null>(null);
  const patch = usePatchActuator(a.id);
  const open = (command: string) => {
    setLastCommand(command);
    setDialog(command);
  };
  const ui = (
    <>
      {tracked && <CommandTracker tracked={tracked} className="mt-3" />}
      {/* lastCommand menahan isi dialog selama animasi tutup. */}
      <CommandDialog actuator={a} command={dialog ?? lastCommand} open={dialog !== null} onClose={() => setDialog(null)} onSent={setTracked} />
      <ConfirmDialog
        open={confirmEnable}
        onClose={() => {
          setConfirmEnable(false);
          patch.reset();
        }}
        onConfirm={() => patch.mutate({ enabled: true }, { onSuccess: () => setConfirmEnable(false) })}
        pending={patch.isPending}
        error={patch.error ? errorMessage(patch.error) : null}
        title={`Aktifkan lagi ${a.name}?`}
        confirmLabel="Aktifkan"
      >
        Setelah ini alat bisa dinyalakan lagi. Belum ada perintah yang dikirim.
      </ConfirmDialog>
    </>
  );
  return { open, ui, requestEnable: () => setConfirmEnable(true) };
}

/** Tombol untuk aktuator yang bukan dua keadaan (Pindah ke stasiun, Kembali ke awal, Hentikan, …). */
function CommandButtons({ actuator: a, onCommand, onEnable }: { actuator: Actuator; onCommand: (c: string) => void; onEnable: () => void }) {
  const specs = commandSpecsFor(a);
  const starts = specs.filter((s) => !s.stop);
  const stops = specs.filter((s) => s.stop);
  return (
    <div className="flex flex-wrap gap-2">
      {a.enabled ? (
        starts.map((s) => (
          <Button key={s.command} variant="accent" size="lg" icon={startIcons[s.command] ?? Play} onClick={() => onCommand(s.command)} className="flex-1">
            {s.label}
          </Button>
        ))
      ) : starts.length ? (
        <Button variant="soft" size="lg" icon={RotateCcw} onClick={onEnable} className="flex-1">
          Aktifkan lagi
        </Button>
      ) : null}
      {/* Tombol berhenti tidak pernah dinonaktifkan. */}
      {stops.map((s) => (
        <Button key={s.command} variant="danger" size="lg" icon={Square} onClick={() => onCommand(s.command)} className="flex-1" aria-label={`${s.label} ${a.name}`}>
          {s.label}
        </Button>
      ))}
    </div>
  );
}

/** Kendali halaman detail: switch untuk dua keadaan, tombol untuk lainnya, semua lewat konfirmasi.
 * Pelihat hanya melihat status. */
export function ActuatorControls({ actuator: a, className }: { actuator: Actuator; className?: string }) {
  const canWrite = useCanWrite();
  const flow = useCommandFlow(a);
  if (!canWrite) return null;
  const sw = switchSpecs(a);
  const on = isOnState(a);
  return (
    <div className={className}>
      {sw ? (
        <div className="flex items-center justify-between gap-3 rounded-[16px] bg-card-2 px-4 py-3 ring-1 ring-line">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{on ? sw.stop.label : sw.start.label}</p>
            <p className="text-xs text-muted">Ketuk switch, lalu konfirmasi.</p>
          </div>
          {!a.enabled && !on ? (
            <Button variant="soft" icon={RotateCcw} onClick={flow.requestEnable}>
              Aktifkan lagi
            </Button>
          ) : (
            <ActuatorSwitch actuator={a} onCommand={flow.open} />
          )}
        </div>
      ) : (
        <CommandButtons actuator={a} onCommand={flow.open} onEnable={flow.requestEnable} />
      )}
      {flow.ui}
    </div>
  );
}

/** Ubin aktuator halaman Kontrol (gaya kartu Kontrol alat di Beranda): ikon, nama, switch, status.
 * Aktuator bukan dua keadaan menampilkan tombol perintah di bawahnya. */
export function ActuatorCard({ actuator: a }: { actuator: Actuator }) {
  const canWrite = useCanWrite();
  const flow = useCommandFlow(a);
  const sw = switchSpecs(a);
  const on = isOnState(a);
  const typeLabel = actuatorTypeLabel(a.type);
  return (
    <section aria-label={a.name} className="flex min-w-0 flex-col rounded-[16px] bg-card p-3.5 ring-1 ring-line">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-card-2 ring-1 ring-line">
          <ActuatorPicto kind={a.type} className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/actuators/${a.id}`}
            className="group inline-flex max-w-full items-center gap-0.5 rounded-[6px] text-[15px] leading-5 font-semibold text-ink hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="truncate">{a.name}</span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-muted group-hover:text-accent-ink" strokeWidth={2} />
            <span className="sr-only"> — buka detail</span>
          </Link>
          {typeLabel && <p className="truncate text-xs text-muted">{typeLabel}</p>}
        </div>
        <div className="shrink-0 pt-0.5">{sw ? <ActuatorSwitch actuator={a} onCommand={flow.open} /> : !a.enabled && <Badge tone="warn">Nonaktif</Badge>}</div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-dashed border-line pt-2.5 text-xs">
        <p className={cn("flex min-w-0 items-center gap-1.5", on ? "font-medium text-accent-ink" : "text-muted")}>
          <StatusDot tone={on ? "ok" : "neutral"} pulse={on} className="size-1.5" />
          <span className="truncate">
            {reportedStateLabel(a.currentState, isSequenceActuator(a))}
            {a.stateUpdatedAt && (
              <span className="font-normal text-muted">
                {" · "}
                <RelativeTime iso={a.stateUpdatedAt} />
              </span>
            )}
          </span>
        </p>
        {a.maxRunSeconds != null && <p className="text-muted">paling lama {formatDuration(a.maxRunSeconds)}</p>}
      </div>
      {canWrite && !sw && (
        <div className="mt-3">
          <CommandButtons actuator={a} onCommand={flow.open} onEnable={flow.requestEnable} />
        </div>
      )}
      {canWrite && sw && !a.enabled && !on && (
        <Button variant="soft" size="sm" icon={RotateCcw} onClick={flow.requestEnable} className="mt-3 self-start">
          Aktifkan lagi
        </Button>
      )}
      {flow.ui}
    </section>
  );
}
