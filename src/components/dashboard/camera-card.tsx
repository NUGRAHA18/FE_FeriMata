"use client";

import { Bell, ChevronLeft, ChevronRight, Play, ScanEye, Square } from "lucide-react";
import { useState } from "react";
import { CommandDialog } from "@/components/actuators/command-dialog";
import { CommandTracker, type TrackedCommand } from "@/components/actuators/command-tracker";
import { DetectionImage, ScoreBars } from "@/components/ai/detection-parts";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status";
import { patrolActuatorCode } from "@/config/dashboard-layout";
import { useCanWrite } from "@/lib/auth/use-session";
import { GreenhouseScene } from "@/components/illustrations";
import { useShell } from "@/components/shell/shell-context";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/skeleton";
import { RelativeTime } from "@/components/ui/time";
import { errorMessage } from "@/lib/api/client";
import { useActuators, useDetections } from "@/lib/api/queries";
import { detectionTypeLabel, panDirectionLabel } from "@/lib/format";

const PAGER_SIZE = 10;
const noFilter = { kind: "none" } as const;

const overlayBtn =
  "grid size-9 place-items-center rounded-[10px] bg-black/35 text-white backdrop-blur-md transition hover:bg-black/50 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-white";

// Status aktuator virtual TROLLEY-PATROL + tombol Patroli/Hentikan; tidak tampil bila katalog tanpa
// aktuator patroli.
function PatrolBar() {
  const patrol = useActuators((list) => list.find((a) => a.code === patrolActuatorCode) ?? null).data;
  const canWrite = useCanWrite();
  const [dialog, setDialog] = useState<"START" | "STOP" | null>(null);
  const [lastCommand, setLastCommand] = useState<"START" | "STOP">("START");
  const [tracked, setTracked] = useState<TrackedCommand | null>(null);
  if (!patrol) return null;
  const running = patrol.currentState?.toUpperCase() === "ON";
  const open = (c: "START" | "STOP") => {
    setLastCommand(c);
    setDialog(c);
  };

  return (
    <div className="mt-3 rounded-inner bg-card-2 px-3.5 py-3 ring-1 ring-line">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm text-ink-2">
          <StatusDot tone={running ? "ok" : "neutral"} pulse={running} />
          {running ? "Patroli kamera sedang berjalan" : "Patroli kamera tidak berjalan"}
        </p>
        {canWrite &&
          (running ? (
            <Button variant="danger" size="sm" icon={Square} onClick={() => open("STOP")}>
              Hentikan
            </Button>
          ) : (
            <Button variant="accent" size="sm" icon={Play} onClick={() => open("START")} disabled={!patrol.enabled}>
              Patroli sekarang
            </Button>
          ))}
      </div>
      {tracked && <CommandTracker tracked={tracked} className="mt-2.5" />}
      <CommandDialog actuator={patrol} command={dialog ?? lastCommand} open={dialog !== null} onClose={() => setDialog(null)} onSent={setTracked} />
    </div>
  );
}

/** Kartu Kamera AI: gambar deteksi terbaru, pager antardeteksi (1/N), bar skor N/P/K, tombol patroli. */
export function CameraCard() {
  const q = useDetections(noFilter, 0, PAGER_SIZE);
  const { openAlertDrawer } = useShell();
  const [index, setIndex] = useState(0);
  const items = q.data?.content ?? [];
  const i = Math.min(index, Math.max(0, items.length - 1));
  const d = items[i] ?? null;

  return (
    <Card>
      <CardHeader title="Foto tanaman terbaru" icon={ScanEye} href="/ai" hrefLabel="Buka halaman kamera" />
      {q.isPending ? (
        <Skeleton className="aspect-[4/3] w-full rounded-inner" />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !d ? (
        <div className="relative flex min-h-56 flex-col items-center overflow-hidden rounded-inner bg-gradient-to-b from-accent-soft/60 to-card-2 px-6 pt-7 pb-28 text-center ring-1 ring-line">
          <span className="grid size-12 place-items-center rounded-full bg-card text-accent shadow-card ring-1 ring-line">
            <ScanEye aria-hidden className="size-6" strokeWidth={1.8} />
          </span>
          <p className="mt-3 font-semibold text-ink">Belum ada foto dari kamera</p>
          <p className="mt-1 max-w-64 text-sm text-ink-2">Foto dan hasil pemeriksaan tanaman akan muncul di sini.</p>
          <GreenhouseScene className="absolute right-0 bottom-0 h-28 w-56" />
        </div>
      ) : (
        <>
          <DetectionImage detection={d} className="aspect-[4/3] w-full">
            <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/45 to-transparent p-3 text-white">
              <span className="rounded-md bg-black/30 px-2 py-0.5 font-mono text-xs backdrop-blur-md">{[d.stationCode ?? "—", panDirectionLabel(d.panDirection)].filter(Boolean).join(" · ")}</span>
              <span className="text-xs opacity-90">
                <RelativeTime iso={d.detectedAt} />
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/45 to-transparent p-3">
              <span className="tabular text-xs font-medium text-white" aria-live="polite">
                {i + 1}/{items.length}
              </span>
              <div className="flex gap-1.5">
                <button type="button" className={overlayBtn} aria-label="Foto yang lebih baru" disabled={i === 0} onClick={() => setIndex(i - 1)}>
                  <ChevronLeft aria-hidden className="size-4" />
                </button>
                <button type="button" className={overlayBtn} aria-label="Buka peringatan" onClick={openAlertDrawer}>
                  <Bell aria-hidden className="size-4" strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  className={overlayBtn}
                  aria-label="Foto yang lebih lama"
                  disabled={i >= items.length - 1}
                  onClick={() => setIndex(i + 1)}
                >
                  <ChevronRight aria-hidden className="size-4" />
                </button>
              </div>
            </div>
          </DetectionImage>
          <div className="mt-3 flex items-baseline justify-between gap-2 text-xs text-ink-2">
            <span className="truncate">{detectionTypeLabel(d.detectionType)}</span>
            <span>{d.plantCode ?? ""}</span>
          </div>
          <ScoreBars detection={d} className="mt-2.5" />
        </>
      )}
      <PatrolBar />
    </Card>
  );
}
