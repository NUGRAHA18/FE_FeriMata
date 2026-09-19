"use client";

import { Bell, ChevronLeft, ChevronRight, ScanEye } from "lucide-react";
import { useState } from "react";
import { DetectionImage, ScoreBars } from "@/components/ai/detection-parts";
import { useShell } from "@/components/shell/shell-context";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { RelativeTime } from "@/components/ui/time";
import { errorMessage } from "@/lib/api/client";
import { useDetections } from "@/lib/api/queries";

const PAGER_SIZE = 10;
const noFilter = { kind: "none" } as const;

const overlayBtn =
  "grid size-9 place-items-center rounded-[10px] bg-black/35 text-white backdrop-blur-md transition hover:bg-black/50 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-white";

/**
 * Kartu Kamera AI: gambar deteksi terbaru, pager antardeteksi (1/N), bar skor N/P/K.
 * Tidak ada tombol "ambil foto" — backend belum punya perintah capture.
 */
export function CameraCard() {
  const q = useDetections(noFilter, 0, PAGER_SIZE);
  const { openAlertDrawer } = useShell();
  const [index, setIndex] = useState(0);
  const items = q.data?.content ?? [];
  const i = Math.min(index, Math.max(0, items.length - 1));
  const d = items[i] ?? null;

  return (
    <Card>
      <CardHeader title="Kamera AI" icon={ScanEye} href="/ai" hrefLabel="Buka halaman AI/Kamera" />
      {q.isPending ? (
        <Skeleton className="aspect-[4/3] w-full rounded-inner" />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !d ? (
        <EmptyState icon={<ScanEye aria-hidden className="size-5 text-muted" strokeWidth={1.6} />} title="Belum ada deteksi AI" hint="Deteksi baru akan muncul otomatis." />
      ) : (
        <>
          <DetectionImage detection={d} className="aspect-[4/3] w-full">
            <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/45 to-transparent p-3 text-white">
              <span className="rounded-md bg-black/30 px-2 py-0.5 font-mono text-xs backdrop-blur-md">{d.stationCode ?? "—"}</span>
              <span className="text-xs opacity-90">
                <RelativeTime iso={d.detectedAt} />
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/45 to-transparent p-3">
              <span className="tabular text-xs font-medium text-white" aria-live="polite">
                {i + 1}/{items.length}
              </span>
              <div className="flex gap-1.5">
                <button type="button" className={overlayBtn} aria-label="Deteksi sebelumnya (lebih baru)" disabled={i === 0} onClick={() => setIndex(i - 1)}>
                  <ChevronLeft aria-hidden className="size-4" />
                </button>
                <button type="button" className={overlayBtn} aria-label="Buka alert" onClick={openAlertDrawer}>
                  <Bell aria-hidden className="size-4" strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  className={overlayBtn}
                  aria-label="Deteksi berikutnya (lebih lama)"
                  disabled={i >= items.length - 1}
                  onClick={() => setIndex(i + 1)}
                >
                  <ChevronRight aria-hidden className="size-4" />
                </button>
              </div>
            </div>
          </DetectionImage>
          <div className="mt-3 flex items-baseline justify-between gap-2 text-xs text-muted">
            <span className="truncate">{d.detectionType}</span>
            <span className="font-mono">{d.plantCode ?? d.deviceCode}</span>
          </div>
          <ScoreBars detection={d} className="mt-2.5" />
        </>
      )}
    </Card>
  );
}
