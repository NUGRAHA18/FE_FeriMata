"use client";

import dynamic from "next/dynamic";
import { Camera, Home, MapPin, Play, Square, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { CommandDialog } from "@/components/actuators/command-dialog";
import { CommandTracker, type TrackedCommand } from "@/components/actuators/command-tracker";
import { GreenhouseMap } from "@/components/dashboard/greenhouse-map";
import { DeviceIssueChips, livenessTone } from "@/components/devices/device-row";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge, StatusDot } from "@/components/ui/status";
import { RelativeTime } from "@/components/ui/time";
import { cameraPanCode, patrolActuatorCode, trolleyGotoCode, trolleyLayout, trolleyServiceCodes } from "@/config/dashboard-layout";
import { useActuators, useOverview, useReadingByMetric } from "@/lib/api/queries";
import type { Actuator } from "@/lib/api/types";
import { useCanWrite } from "@/lib/auth/use-session";
import { livenessLabel } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { deriveStatus, estimatedX, initialStopWatch, inputsFrom, nextStopWatch, stationX, stopTarget, stopWatchFlags, type StopWatch, type TrolleyStatus } from "./trolley-model";
import type { ViewPreset } from "./trolley-scene";

const TrolleyScene = dynamic(() => import("./trolley-scene"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

const views: { value: ViewPreset; label: string }[] = [
  { value: "miring", label: "Miring" },
  { value: "samping", label: "Samping" },
  { value: "atas", label: "Atas" },
];

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

type Dialog = { actuator: Actuator; command: string; station?: number; key: number };

/** Kereta kamera: model 3D (atau denah 2D bila WebGL tidak ada), status, dan perintah tingkat tinggi
 * TROLLEY-GOTO / TROLLEY-PATROL. Relay mentah R2/R3 ada di bagian Servis halaman Kontrol. */
export function TrolleyControl() {
  const canWrite = useCanWrite();
  const reduceMotion = useReducedMotion();
  const now = useNow();
  const [view, setView] = useState<ViewPreset>("miring");
  const [webgl, setWebgl] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [lastDialog, setLastDialog] = useState<Dialog | null>(null);
  const [tracked, setTracked] = useState<TrackedCommand | null>(null);

  const byCode = useActuators((list) => Object.fromEntries(list.map((a) => [a.code, a]))).data;
  const station = useReadingByMetric(trolleyLayout.stationKey);
  const home = useReadingByMetric(trolleyLayout.homeLimitKey);
  const end = useReadingByMetric(trolleyLayout.endLimitKey);

  const gotoAct = byCode?.[trolleyGotoCode];
  const patrolAct = byCode?.[patrolActuatorCode];
  const [runCode, dirCode] = trolleyServiceCodes;
  const run = byCode?.[runCode];
  const deviceCode = gotoAct?.deviceCode ?? patrolAct?.deviceCode;
  const device = useOverview((o) => o.devices.items.find((d) => d.deviceCode === deviceCode) ?? null).data;

  // Kereta yang dihentikan di antara stasiun tidak melaporkan posisi baru; amati sendiri transisinya
  // (pola "sesuaikan state saat render" React, tanpa effect).
  const rawMoving = deriveStatus(
    inputsFrom({ station: null, homeLimit: null, endLimit: null, run: run?.currentState, patrol: patrolAct?.currentState, goto: gotoAct?.currentState }),
  ).moving;
  const runOn = run?.currentState?.toUpperCase() === "ON";
  const [watch, setWatch] = useState<StopWatch>(initialStopWatch);
  const nextWatch = nextStopWatch(watch, { moving: rawMoving, runOn, now, stationMark: station?.recordedAt ?? null });
  if (nextWatch !== watch) setWatch(nextWatch);

  const status: TrolleyStatus = deriveStatus(
    inputsFrom({
      station: station?.value,
      homeLimit: home?.value,
      endLimit: end?.value,
      run: run?.currentState,
      dir: byCode?.[dirCode]?.currentState,
      pan: byCode?.[cameraPanCode]?.currentState,
      patrol: patrolAct?.currentState,
      goto: gotoAct?.currentState,
      ...stopWatchFlags(watch, now),
    }),
  );

  // Perkiraan posisi di gambar hanya selama motor jalan (patroli juga berhenti untuk memotret).
  const movingFor = watch.runSince !== null && now ? (now - watch.runSince) / 1000 : 0;
  const x = estimatedX(status, movingFor);

  if (!gotoAct && !patrolAct) return null;

  const open = (actuator: Actuator | undefined, command: string, st?: number) => {
    if (!actuator) return;
    const d = { actuator, command, station: st, key: Date.now() };
    setDialog(d);
    setLastDialog(d);
  };
  const blocked = status.moving || status.limitFault;
  const stopAct = stopTarget(status) === "patrol" ? patrolAct : gotoAct;
  const here = selected != null && !status.moving && !status.positionStale && status.station === selected;
  const tone = status.limitFault ? "danger" : status.moving ? "ok" : status.station == null ? "warn" : "neutral";

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title="Kereta kamera"
        icon={Camera}
        action={webgl ? <Segmented label="Sudut pandang" size="sm" value={view} onChange={setView} options={views} /> : null}
      />
      {device && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <StatusDot tone={device.onBackupPower ? "danger" : (livenessTone[device.status] ?? "neutral")} />
            Komputer kereta {(livenessLabel[device.status] ?? device.status).toLowerCase()}
          </span>
          {(device.status !== "ONLINE" || device.onBackupPower) && <DeviceIssueChips s={device} />}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-base font-semibold text-ink" aria-live="polite">
            <StatusDot tone={tone} pulse={status.moving} />
            {status.headline}
          </p>
          {status.detail && <p className="mt-0.5 text-sm text-ink-2">{status.detail}</p>}
        </div>
        <p className="text-xs text-muted">
          {status.pan && <>Kamera menghadap {status.pan} · </>}
          {station?.recordedAt ? <RelativeTime iso={station.recordedAt} prefix="posisi dilaporkan " /> : "posisi belum dilaporkan"}
        </p>
      </div>

      <div className="overflow-hidden rounded-inner bg-card-2 ring-1 ring-line">
        {webgl ? (
          <TrolleyScene
            x={x}
            panWest={status.pan == null ? null : status.pan === "barat"}
            moving={status.moving}
            fault={status.limitFault}
            selected={selected}
            onSelect={canWrite ? (n) => setSelected((s) => (s === n ? null : n)) : undefined}
            view={view}
            reduceMotion={reduceMotion}
            onUnavailable={() => setWebgl(false)}
            className="aspect-[4/3] w-full sm:aspect-[16/9]"
          />
        ) : (
          <GreenhouseMap
            trolleyStation={status.station}
            selectedStation={selected != null ? `ST-${String(selected).padStart(2, "0")}` : null}
            onStationSelect={canWrite ? (code) => setSelected(Number(code.replace(/\D/g, "")) || null) : undefined}
            className="p-2"
          />
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        {canWrite ? "Ketuk nomor stasiun untuk memindahkan kereta ke sana. " : ""}
        Stasiun 1 paling dekat dengan posisi awal di ujung selatan, jarak antarstasiun {trolleyLayout.stationSpacingCm} cm. Di komputer, seret gambar untuk memutar.
      </p>

      {canWrite && selected != null && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-inner bg-accent-soft p-3 ring-1 ring-accent/30">
          <p className="min-w-0 flex-1 text-sm text-accent-ink">
            <span className="font-semibold">Stasiun {selected}</span> · {Math.round((stationX(selected) - stationX(1)) * 100)} cm dari stasiun 1
            {here && " · kereta sudah di sini"}
          </p>
          <Button
            variant="accent"
            icon={MapPin}
            onClick={() => open(gotoAct, "GOTO_STATION", selected)}
            disabled={!gotoAct?.enabled || blocked || here}
          >
            Pindah ke stasiun {selected}
          </Button>
          <Button variant="ghost" icon={X} onClick={() => setSelected(null)}>
            Batal pilih
          </Button>
        </div>
      )}

      {canWrite && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button size="lg" icon={Home} onClick={() => open(gotoAct, "HOME")} disabled={!gotoAct?.enabled || blocked}>
            Kembali ke awal
          </Button>
          <Button size="lg" variant="accent" icon={Play} onClick={() => open(patrolAct, "START")} disabled={!patrolAct?.enabled || blocked}>
            Patroli sekarang
          </Button>
          <Button size="lg" variant="danger" icon={Square} onClick={() => open(stopAct, "STOP")} disabled={!stopAct}>
            Hentikan
          </Button>
        </div>
      )}
      {canWrite && (gotoAct?.enabled === false || patrolAct?.enabled === false) && (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted">
          <Badge tone="warn">Nonaktif</Badge>
          Sebagian perintah kereta dimatikan di Pengaturan.
        </p>
      )}
      {tracked && <CommandTracker tracked={tracked} className="mt-3" />}

      {/* lastDialog menahan isi dialog selama animasi tutup. */}
      {(dialog ?? lastDialog) && (
        <CommandDialog
          key={(dialog ?? lastDialog)!.key}
          actuator={(dialog ?? lastDialog)!.actuator}
          command={(dialog ?? lastDialog)!.command}
          defaultStation={(dialog ?? lastDialog)!.station}
          open={dialog !== null}
          onClose={() => setDialog(null)}
          onSent={(t) => {
            setTracked(t);
            setSelected(null);
          }}
        />
      )}
    </Card>
  );
}
