"use client";

import { Camera, Droplet, MapPin, Sun } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/status";
import { RelativeTime } from "@/components/ui/time";
import { siteConfig } from "@/config/site";
import { conditionKeys, trolleyLayout, type PlotId } from "@/config/dashboard-layout";
import { useReadingByMetric } from "@/lib/api/queries";
import { formatLongDate, formatReading, formatTime, formatUnit, stationCode } from "@/lib/format";
import { useConnectionState } from "@/lib/realtime/stomp";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/cn";
import { GreenhouseMap } from "./greenhouse-map";

function Clock() {
  const now = useNow();
  return (
    <div className="text-right text-sm text-ink-2" suppressHydrationWarning>
      <p className="tabular">{now ? formatLongDate(now) : " "}</p>
      <p className="tabular text-xs text-ink-2">{now ? `${formatTime(now, true)} WIB` : " "}</p>
    </div>
  );
}

function SmallStat({ icon: Icon, label, metricKey }: { icon: typeof Sun; label: string; metricKey: string }) {
  const r = useReadingByMetric(metricKey);
  const v = formatReading(r);
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-sm text-ink-2">
        <Icon aria-hidden className="size-4" strokeWidth={1.7} />
        {label}
      </p>
      <p className="tabular mt-0.5 text-[clamp(1.25rem,6vw,1.5rem)] whitespace-nowrap text-ink">
        {v ?? "—"}
        {v && r?.unit && <span className="ml-1 text-base text-muted">{formatUnit(r.unit)}</span>}
      </p>
    </div>
  );
}

export function useTrolleyStation(): number | null {
  const r = useReadingByMetric(trolleyLayout.stationKey);
  return r?.value ?? null;
}

/** Kartu besar "Kondisi Greenhouse + Denah" — pengganti kartu cuaca di referensi. */
export function ConditionsCard({ plot, onPlotChange }: { plot: PlotId; onPlotChange: (p: PlotId) => void }) {
  const air = useReadingByMetric(conditionKeys.airTemperature);
  const station = useTrolleyStation();
  const stale = useConnectionState() !== "connected";
  const airValue = formatReading(air);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5 text-sm text-ink-2">
          <MapPin aria-hidden className="size-4 shrink-0" strokeWidth={1.6} />
          <span className="truncate">{siteConfig.location || "Lokasi belum diatur"}</span>
        </p>
        <Clock />
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] sm:gap-5">
        <div className="flex min-w-0 flex-col">
          <p className="text-sm font-medium text-ink-2">Suhu udara di dalam greenhouse</p>
          <p className={cn("tabular mt-1 flex items-start text-ink", stale && air && "opacity-60")}>
            <span className="metric-value text-[clamp(3rem,16vw,4.5rem)] font-normal">{airValue ?? "—"}</span>
            {airValue && air?.unit && <span className="mt-2 text-3xl text-muted">{formatUnit(air.unit)}</span>}
          </p>
          <p className="mt-1 text-xs text-ink-2">{air ? <RelativeTime iso={air.recordedAt} prefix="diperbarui " /> : "belum ada data"}</p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-1">
            <SmallStat icon={Droplet} label="Kelembapan udara" metricKey={conditionKeys.airHumidity} />
            <SmallStat icon={Sun} label="Cahaya" metricKey={conditionKeys.illuminance} />
          </div>

          <div className="mt-auto flex flex-col items-start gap-2 pt-5">
            <Chip icon={Camera}>
              Kamera: {station == null ? "—" : stationCode(Math.round(station))}
            </Chip>
            <p className="text-xs text-ink-2">Ketuk plot di denah untuk berganti.</p>
          </div>
        </div>
        <GreenhouseMap selectedPlot={plot} onPlotSelect={onPlotChange} trolleyStation={station} className="self-center" />
      </div>
    </Card>
  );
}
