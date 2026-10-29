"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExportButton } from "@/components/ui/export-button";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import { qk } from "@/lib/api/query-keys";
import { csvFilename } from "@/lib/csv";
import { formatDateTime, formatNumber } from "@/lib/format";
import { fetchHistory, intervalLabel, RANGES, type RangeKey } from "@/lib/history";
import { exportSensorHistory } from "@/lib/reports";

// Recharts hanya dimuat di halaman detail sensor.
const HistoryChart = dynamic(() => import("./history-chart"), { ssr: false, loading: () => <Skeleton className="size-full rounded-inner" /> });

const rangeOptions = (Object.keys(RANGES) as RangeKey[]).map((k) => ({ value: k, label: RANGES[k].label }));

export function HistoryPanel({ sensorId, unit, label }: { sensorId: number; unit: string; label: string }) {
  const [range, setRange] = useState<RangeKey>("24h");
  const [view, setView] = useState<"chart" | "table">("chart");
  const q = useQuery({
    queryKey: qk.sensorHistory(sensorId, range),
    queryFn: ({ signal }) => fetchHistory(sensorId, range, signal),
    staleTime: 60_000,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented label="Rentang waktu" value={range} onChange={setRange} options={rangeOptions} size="sm" />
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Tampilan"
            value={view}
            onChange={setView}
            size="sm"
            options={[
              { value: "chart", label: "Grafik" },
              { value: "table", label: "Tabel" },
            ]}
          />
          <ExportButton
            label="Unduh CSV"
            run={(signal) => exportSensorHistory(sensorId, range, signal)}
            filename={() => csvFilename(label, RANGES[range].label)}
            truncatedHint="Pilih rentang yang lebih pendek untuk data lengkap."
          />
        </div>
      </div>
      {q.isPending ? (
        <Skeleton className="h-72 w-full rounded-inner" />
      ) : q.error ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !q.data.total ? (
        <EmptyState title="Belum ada data pada rentang waktu ini" />
      ) : view === "chart" ? (
        <figure>
          <div className="h-72 w-full" role="img" aria-label={`Grafik ${label} ${RANGES[range].label} terakhir`}>
            <HistoryChart points={q.data.points} unit={unit} spanMs={RANGES[range].ms} />
          </div>
          <figcaption className="mt-2 text-xs text-muted">
            Garis = rata-rata tiap {intervalLabel(q.data.interval)}, pita = angka terendah–tertinggi. Dari {q.data.total.toLocaleString("id-ID")} pembacaan. Garis
            yang terputus berarti alat tidak mengirim data. Angka mentah, belum dikoreksi kalibrasi.
          </figcaption>
        </figure>
      ) : (
        <div className="scroll-thin max-h-80 overflow-y-auto rounded-inner bg-card-2 ring-1 ring-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card-2 text-xs text-muted">
              <tr className="border-b border-line">
                <th className="px-3.5 py-2 text-left font-medium">Mulai (WIB)</th>
                <th className="px-3.5 py-2 text-right font-medium">Rata-rata {unit && `(${unit})`}</th>
                <th className="px-3.5 py-2 text-right font-medium">Terendah</th>
                <th className="px-3.5 py-2 text-right font-medium">Tertinggi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {q.data.points
                .filter((p) => p.count > 0)
                .reverse()
                .map((p) => (
                  <tr key={p.t}>
                    <td className="tabular px-3.5 py-2 text-ink-2">{formatDateTime(p.t)}</td>
                    <td className="tabular px-3.5 py-2 text-right text-ink">{formatNumber(p.avg) ?? "—"}</td>
                    <td className="tabular px-3.5 py-2 text-right text-ink-2">{formatNumber(p.min) ?? "—"}</td>
                    <td className="tabular px-3.5 py-2 text-right text-ink-2">{formatNumber(p.max) ?? "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
