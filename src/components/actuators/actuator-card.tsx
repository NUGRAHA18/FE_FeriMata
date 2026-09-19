"use client";

import { Power, RotateCcw, Square } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CornerLink } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge, StatusDot } from "@/components/ui/status";
import { RelativeTime } from "@/components/ui/time";
import { reportedStateLabel } from "@/lib/actuator-safety";
import { errorMessage } from "@/lib/api/client";
import { usePatchActuator } from "@/lib/api/queries";
import type { Actuator } from "@/lib/api/types";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CommandDialog } from "./command-dialog";
import { CommandTracker, type TrackedCommand } from "./command-tracker";

export function ReportedState({ actuator: a, large }: { actuator: Pick<Actuator, "currentState" | "stateUpdatedAt">; large?: boolean }) {
  const on = a.currentState?.toUpperCase() === "ON";
  const tone = a.currentState == null ? "neutral" : on ? "ok" : "neutral";
  return (
    <div>
      <p className={cn("flex items-center gap-2 font-medium text-ink", large ? "text-2xl" : "text-sm")}>
        <StatusDot tone={tone} pulse={on} className={large ? "size-2.5" : undefined} />
        {reportedStateLabel(a.currentState)}
      </p>
      <p className="mt-0.5 text-xs text-muted">
        {a.stateUpdatedAt ? <RelativeTime iso={a.stateUpdatedAt} prefix="dilaporkan perangkat " /> : "perangkat belum melaporkan status"}
      </p>
    </div>
  );
}

/** Tombol ON/STOP + dialog + pelacak perintah terakhir. STOP tidak pernah dinonaktifkan. */
export function ActuatorControls({ actuator: a, className }: { actuator: Actuator; className?: string }) {
  const [dialog, setDialog] = useState<"ON" | "OFF" | null>(null);
  const [confirmEnable, setConfirmEnable] = useState(false);
  const [tracked, setTracked] = useState<TrackedCommand | null>(null);
  const patch = usePatchActuator(a.id);

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {a.enabled ? (
          <Button variant="dark" icon={Power} onClick={() => setDialog("ON")} className="flex-1 sm:flex-none">
            ON
          </Button>
        ) : (
          <Button variant="soft" icon={RotateCcw} onClick={() => setConfirmEnable(true)} className="flex-1 sm:flex-none">
            Aktifkan kembali
          </Button>
        )}
        <Button variant="danger" icon={Square} onClick={() => setDialog("OFF")} className="flex-1 sm:flex-none" aria-label={`STOP ${a.name}`}>
          STOP
        </Button>
      </div>
      {tracked && <CommandTracker tracked={tracked} className="mt-3" />}

      <CommandDialog actuator={a} command={dialog ?? "OFF"} open={dialog !== null} onClose={() => setDialog(null)} onSent={setTracked} />
      <ConfirmDialog
        open={confirmEnable}
        onClose={() => {
          setConfirmEnable(false);
          patch.reset();
        }}
        onConfirm={() => patch.mutate({ enabled: true }, { onSuccess: () => setConfirmEnable(false) })}
        pending={patch.isPending}
        error={patch.error ? errorMessage(patch.error) : null}
        title={`Aktifkan kembali ${a.name}?`}
        confirmLabel="Aktifkan"
      >
        Aktuator akan kembali bisa menerima perintah ON. Tidak ada perintah yang dikirim saat mengaktifkan.
      </ConfirmDialog>
    </div>
  );
}

export function ActuatorCard({ actuator: a }: { actuator: Actuator }) {
  return (
    <section aria-label={a.name} className={cn("flex flex-col rounded-inner bg-card-2 p-4", !a.enabled && "ring-1 ring-line")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-medium text-ink">{a.name}</h3>
            {!a.enabled && <Badge tone="warn">Nonaktif</Badge>}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">
            #{a.code}
            {a.type ? ` • ${a.type}` : ""}
          </p>
        </div>
        <CornerLink href={`/actuators/${a.id}`} label={`Detail ${a.name}`} className="bg-card" />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <ReportedState actuator={a} />
        <p className="text-right text-xs text-muted">{a.maxRunSeconds != null ? `maks ${formatDuration(a.maxRunSeconds)}` : "tanpa batas"}</p>
      </div>
      <ActuatorControls actuator={a} className="mt-4" />
    </section>
  );
}
