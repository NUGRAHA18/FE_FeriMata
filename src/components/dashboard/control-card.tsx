"use client";

import Link from "next/link";
import { ChevronRight, ToggleRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { CommandDialog } from "@/components/actuators/command-dialog";
import { CommandTracker, type TrackedCommand } from "@/components/actuators/command-tracker";
import { ActuatorSwitch, isOnState } from "@/components/actuators/actuator-card";
import { ActuatorPicto } from "@/components/icons/pictos";
import { AutoModeTile } from "./auto-mode-tile";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status";
import { dashboardActuators } from "@/config/dashboard-layout";
import { isSequenceActuator } from "@/lib/actuator-commands";
import { reportedStateLabel } from "@/lib/actuator-safety";
import { errorMessage } from "@/lib/api/client";
import { useActuators } from "@/lib/api/queries";
import type { Actuator } from "@/lib/api/types";
import { useCanWrite } from "@/lib/auth/use-session";
import { cn } from "@/lib/cn";

/*
 * Ubin: [ikon bulat] Nama            [switch]
 *                    ● Menyala
 * Kartu sempit (dua kolom di HP): ikon + switch di baris atas, nama & status di bawahnya.
 */
const tileCls = "@container flex min-h-[76px] w-full min-w-0 rounded-[16px] bg-card p-3 ring-1 ring-line";

function TileBody({ icon, name, title, state, tone, right }: { icon: ReactNode; name: string; title?: string; state: string; tone: "ok" | "neutral"; right: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-2 @[14rem]:flex-row @[14rem]:items-center @[14rem]:gap-3">
      <div className="flex items-center justify-between gap-2 @[14rem]:contents">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card-2 ring-1 ring-line @[14rem]:size-11">
          {icon}
        </span>
        <div className="shrink-0 @[14rem]:order-last">{right}</div>
      </div>
      <div className="min-w-0 @[14rem]:flex-1">
        <p className="truncate text-sm leading-5 font-semibold text-ink" title={title ?? name}>
          {name}
        </p>
        <p className={cn("mt-0.5 flex items-center gap-1.5 text-xs", tone === "ok" ? "font-medium text-accent-ink" : "text-muted")}>
          <StatusDot tone={tone} pulse={tone === "ok"} className="size-1.5" />
          <span className="truncate">{state}</span>
        </p>
      </div>
    </div>
  );
}

/** Satu aktuator dengan switch (dialog konfirmasi dibuka kartu induk). Pelihat hanya melihat status. */
function SwitchTile({ actuator: a, label, onCommand }: { actuator: Actuator; label?: string; onCommand: (a: Actuator, command: string) => void }) {
  const name = label ?? a.name;
  return (
    <div className={tileCls}>
      <TileBody
        icon={<ActuatorPicto kind={a.type} className="size-6 @[14rem]:size-7" />}
        name={name}
        title={a.name}
        state={reportedStateLabel(a.currentState, isSequenceActuator(a))}
        tone={isOnState(a) ? "ok" : "neutral"}
        right={<ActuatorSwitch actuator={a} name={name} onCommand={(c) => onCommand(a, c)} />}
      />
    </div>
  );
}

/** Beberapa aktuator sejenis dalam satu ubin ringkasan → halaman Kontrol. */
function GroupTile({ list, label }: { list: Actuator[]; label: string }) {
  const onCount = list.filter(isOnState).length;
  return (
    <Link
      href="/actuators"
      aria-label={`${label}: ${onCount} dari ${list.length} menyala — buka halaman Kontrol`}
      className={cn(tileCls, "transition hover:ring-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent")}
    >
      <TileBody
        icon={<ActuatorPicto kind={list[0].type} className="size-6 @[14rem]:size-7" />}
        name={label}
        state={onCount ? `${onCount} dari ${list.length} menyala` : `${list.length} pompa, semua mati`}
        tone={onCount ? "ok" : "neutral"}
        right={<ChevronRight aria-hidden className="size-5 text-muted" strokeWidth={2} />}
      />
    </Link>
  );
}

/** Kartu "Kontrol alat" Beranda: alat terpenting (dashboardActuators) + tautan ke semua alat. */
export function ControlCard({ className }: { className?: string }) {
  const q = useActuators();
  const canWrite = useCanWrite();
  const [dialog, setDialog] = useState<{ actuator: Actuator; command: string } | null>(null);
  const [last, setLast] = useState<{ actuator: Actuator; command: string } | null>(null);
  const [tracked, setTracked] = useState<TrackedCommand | null>(null);

  const byCode = new Map((q.data ?? []).map((a) => [a.code, a]));
  const tiles = dashboardActuators
    .map((def) => ({ def, list: def.codes.map((c) => byCode.get(c)).filter((a): a is Actuator => !!a) }))
    .filter((t) => t.list.length > 0);
  const openCommand = (actuator: Actuator, command: string) => {
    setTracked(null);
    setLast({ actuator, command });
    setDialog({ actuator, command });
  };

  return (
    <Card mobileBare className={cn("min-w-0", className)}>
      <CardHeader mobileSection title={canWrite ? "Kontrol alat" : "Status alat"} icon={ToggleRight} href="/actuators" hrefLabel="Lihat semua alat yang bisa dikendalikan" />
      {q.isPending ? (
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] rounded-[16px]" />
          ))}
        </div>
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : tiles.length === 0 ? (
        <p className="text-sm text-ink-2">Belum ada alat yang bisa dikendalikan di katalog.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5">
          <li className="col-span-2 flex min-w-0">
            <AutoModeTile />
          </li>
          {tiles.map(({ def, list }) => (
            <li key={def.codes.join()} className="flex min-w-0">
              {list.length > 1 ? (
                <GroupTile list={list} label={def.label ?? list[0].name} />
              ) : (
                <SwitchTile actuator={list[0]} label={def.label} onCommand={openCommand} />
              )}
            </li>
          ))}
        </ul>
      )}
      {tracked && last && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-muted">Perintah terakhir: {last.actuator.name}</p>
          <CommandTracker tracked={tracked} />
        </div>
      )}
      {last && (
        <CommandDialog
          actuator={last.actuator}
          command={(dialog ?? last).command}
          open={dialog !== null}
          onClose={() => setDialog(null)}
          onSent={setTracked}
        />
      )}
    </Card>
  );
}
