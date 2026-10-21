"use client";

import { ScanEye, X } from "lucide-react";
import { useState } from "react";
import { DetectionImage, ScoreBars } from "@/components/ai/detection-parts";
import { useTrolleyStation } from "@/components/dashboard/conditions-card";
import { GreenhouseMap } from "@/components/dashboard/greenhouse-map";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { RelativeTime } from "@/components/ui/time";
import { trolleyLayout } from "@/config/dashboard-layout";
import { errorMessage } from "@/lib/api/client";
import type { DetectionFilter } from "@/lib/api/endpoints";
import { useDetections } from "@/lib/api/queries";
import { detectionTypeLabel, formatDateTime, stationCode } from "@/lib/format";

const stations = Array.from({ length: trolleyLayout.stationCount }, (_, i) => stationCode(i + 1));
const knownTypes = ["NUTRIENT_DEFICIENCY", "DISEASE"];

function describe(f: DetectionFilter) {
  if (f.kind === "station") return `Foto di stasiun ${f.stationCode}`;
  if (f.kind === "type") return `Hasil: ${detectionTypeLabel(f.detectionType)}`;
  if (f.kind === "device") return `Alat #${f.deviceId}`;
  return "Semua foto";
}

export default function AiPage() {
  // Filter backend eksklusif: hanya satu yang aktif (stasiun ATAU tipe).
  const [filter, setFilter] = useState<DetectionFilter>({ kind: "none" });
  const [page, setPage] = useState(0);
  const q = useDetections(filter, page, 12);
  const trolley = useTrolleyStation();
  const apply = (f: DetectionFilter) => {
    setFilter(f);
    setPage(0);
  };
  const selectedStation = filter.kind === "station" ? filter.stationCode : null;
  const seenTypes = [...new Set([...knownTypes, ...(q.data?.content.map((d) => d.detectionType) ?? [])])];

  return (
    <>
      <PageHeader title="Kamera" subtitle="Foto tanaman dari kereta kamera dan hasil pemeriksaan kekurangan nutrisi." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Pilih stasiun" icon={ScanEye} />
            <GreenhouseMap
              trolleyStation={trolley}
              selectedStation={selectedStation}
              onStationSelect={(code) => apply(code === selectedStation ? { kind: "none" } : { kind: "station", stationCode: code })}
            />
            <p className="mt-2 text-sm text-muted">Ketuk titik stasiun di rel untuk melihat foto dari stasiun itu saja.</p>
            <div className="mt-4 flex flex-col gap-3">
              <Select
                label="Stasiun"
                hideLabel={false}
                id="ai-station"
                value={selectedStation ?? ""}
                onChange={(e) => apply(e.target.value ? { kind: "station", stationCode: e.target.value } : { kind: "none" })}
                wrapperClassName="justify-between"
              >
                <option value="">Semua</option>
                {stations.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Select
                label="Hasil pemeriksaan"
                hideLabel={false}
                id="ai-type"
                value={filter.kind === "type" ? filter.detectionType : ""}
                onChange={(e) => apply(e.target.value ? { kind: "type", detectionType: e.target.value } : { kind: "none" })}
                wrapperClassName="justify-between"
              >
                <option value="">Semua</option>
                {seenTypes.map((t) => (
                  <option key={t} value={t}>
                    {detectionTypeLabel(t)}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted">Pilih salah satu: stasiun atau hasil pemeriksaan.</p>
            </div>
          </Card>
        </div>

        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-ink">{describe(filter)}</h2>
            {filter.kind !== "none" && (
              <Button size="sm" icon={X} onClick={() => apply({ kind: "none" })}>
                Tampilkan semua
              </Button>
            )}
          </div>
          {q.isPending ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-inner" />
              ))}
            </div>
          ) : q.error ? (
            <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
          ) : !q.data.content.length ? (
            <EmptyState icon={<ScanEye aria-hidden className="size-5" strokeWidth={2} />} title="Belum ada foto" hint="Foto baru muncul sendiri begitu kamera selesai memeriksa tanaman." />
          ) : (
            <div className="flex flex-col gap-4">
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {q.data.content.map((d) => (
                  <li key={d.id} className="flex flex-col rounded-inner bg-card-2 p-3 ring-1 ring-line">
                    <DetectionImage detection={d} className="aspect-[4/3] w-full" />
                    <div className="mt-3 flex items-baseline justify-between gap-2">
                      <button
                        type="button"
                        className="font-mono text-sm font-medium text-ink hover:underline disabled:no-underline"
                        disabled={!d.stationCode}
                        onClick={() => d.stationCode && apply({ kind: "station", stationCode: d.stationCode })}
                      >
                        {d.stationCode ?? "—"}
                      </button>
                      <span className="text-xs text-muted" title={formatDateTime(d.detectedAt)}>
                        <RelativeTime iso={d.detectedAt} />
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted">{detectionTypeLabel(d.detectionType)}</p>
                    <ScoreBars detection={d} className="mt-3" />
                  </li>
                ))}
              </ul>
              <Pagination page={q.data.page} totalPages={q.data.totalPages} totalElements={q.data.totalElements} onChange={setPage} busy={q.isFetching} />
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
