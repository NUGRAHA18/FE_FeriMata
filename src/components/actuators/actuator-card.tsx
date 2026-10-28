"use client";

import { Home, MapPin, Play, Power, RotateCcw, Square, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CornerLink } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge, StatusDot } from "@/components/ui/status";
import { RelativeTime } from "@/components/ui/time";
import { commandSpecsFor, isSequenceActuator } from "@/lib/actuator-commands";
import { reportedStateLabel } from "@/lib/actuator-safety";
import { errorMessage } from "@/lib/api/client";
import { usePatchActuator } from "@/lib/api/queries";
import type { Actuator } from "@/lib/api/types";
import { useCanWrite } from "@/lib/auth/use-session";
import { actuatorTypeLabel, formatDuration } from "@/lib/format";
import { ActuatorIcon } from "@/lib/icons";
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

/**
 * Tombol perintah (Nyalakan/Matikan untuk relay; Patroli/Pindah + Hentikan untuk aktuator
 * berurutan) + dialog + pelacak perintah terakhir. Tombol berhenti tidak pernah dinonaktifkan.
 */
export function ActuatorControls({ actuator: a, className }: { actuator: Actuator; className?: string }) {
  const canWrite = useCanWrite();
  const [dialog, setDialog] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState("OFF");
  const [confirmEnable, setConfirmEnable] = useState(false);
  const [tracked, setTracked] = useState<TrackedCommand | null>(null);
  const patch = usePatchActuator(a.id);
  // Pelihat hanya melihat status; tidak ada tombol yang bisa ditekan lalu ditolak.
  if (!canWrite) return null;

  const specs = commandSpecsFor(a);
  const starts = specs.filter((s) => !s.stop);
  const stops = specs.filter((s) => s.stop);
  const openDialog = (command: string) => {
    setLastCommand(command);
    setDialog(command);
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {a.enabled ? (
          starts.map((s) => (
            <Button key={s.command} variant="accent" size="lg" icon={startIcons[s.command] ?? Play} onClick={() => openDialog(s.command)} className="flex-1">
              {s.label}
            </Button>
          ))
        ) : starts.length ? (
          <Button variant="soft" size="lg" icon={RotateCcw} onClick={() => setConfirmEnable(true)} className="flex-1">
            Aktifkan lagi
          </Button>
        ) : null}
        {stops.map((s) => (
          <Button key={s.command} variant="danger" size="lg" icon={Square} onClick={() => openDialog(s.command)} className="flex-1" aria-label={`${s.label} ${a.name}`}>
            {s.label}
          </Button>
        ))}
      </div>
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
    </div>
  );
}

export function ActuatorCard({ actuator: a }: { actuator: Actuator }) {
  const typeLabel = actuatorTypeLabel(a.type);
  return (
    <section aria-label={a.name} className={cn("flex flex-col rounded-inner bg-card-2 p-4", !a.enabled && "ring-1 ring-line")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <ActuatorIcon kind={a.type} aria-hidden className="size-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-ink">{a.name}</h3>
              {!a.enabled && <Badge tone="warn">Dinonaktifkan</Badge>}
            </div>
            {typeLabel && <p className="mt-0.5 truncate text-xs text-muted">{typeLabel}</p>}
          </div>
        </div>
        <CornerLink href={`/actuators/${a.id}`} label={`Detail ${a.name}`} className="bg-card" />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <ReportedState actuator={a} />
        <p className="text-right text-xs text-muted">{a.maxRunSeconds != null ? `paling lama ${formatDuration(a.maxRunSeconds)}` : ""}</p>
      </div>
      <ActuatorControls actuator={a} className="mt-4" />
    </section>
  );
}
