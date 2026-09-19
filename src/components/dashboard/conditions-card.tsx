"use client";

import { Droplet, MapPin, Sun } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RelativeTime } from "@/components/ui/time";
import { siteConfig } from "@/config/site";
import { conditionKeys, plots, trolleyLayout, type PlotId } from "@/config/dashboard-layout";
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
      <p className="tabular">{now ? formatLongDate(now) : " "}</p>
      <p className="tabular text-xs text-muted">{now ? `${formatTime(now, true)} WIB` : " "}</p>
    </div>
  );
}

function SmallStat({ icon: Icon, label, metricKey }: { icon: typeof Sun; label: string; metricKey: string }) {
  const r = useReadingByMetric(metricKey);
  const v = formatReading(r);
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Icon aria-hidden className="size-3.5" strokeWidth={1.6} />
        {label}
      </p>
      <p className="tabular mt-0.5 text-lg whitespace-nowrap text-ink">
        {v ?? "—"}
        {v && r?.unit && <span className="ml-0.5 text-sm text-muted">{formatUnit(r.unit)}</span>}
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
  const selected = plots.find((p) => p.id === plot)!;

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
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Suhu udara dalam</p>
          <p className={cn("tabular mt-1 flex items-start text-ink", stale && air && "opacity-60")}>
            <span className="metric-value text-[64px]">{airValue ?? "—"}</span>
            {airValue && air?.unit && <span className="mt-1 text-3xl font-light text-muted">{formatUnit(air.unit)}</span>}
          </p>
          <p className="mt-1 text-xs text-muted">{air ? <RelativeTime iso={air.recordedAt} prefix="diperbarui " /> : "belum ada data"}</p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-1">
            <SmallStat icon={Droplet} label="Kelembapan udara" metricKey={conditionKeys.airHumidity} />
            <SmallStat icon={Sun} label="Cahaya" metricKey={conditionKeys.illuminance} />
          </div>

          <div className="mt-auto pt-5">
            <div className="rounded-inner bg-card-2 p-3.5">
              <p className="font-medium text-ink">{selected.label}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted">Prefix data</p>
                  <p className="mt-0.5 font-mono text-ink-2">{selected.prefix}.*</p>
                </div>
                <div>
                  <p className="text-muted">Trolley</p>
                  <p className="mt-0.5 text-ink-2">{station == null ? "belum dilaporkan" : stationCode(Math.round(station))}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <GreenhouseMap selectedPlot={plot} onPlotSelect={onPlotChange} trolleyStation={station} className="self-center" />
      </div>
    </Card>
  );
}
