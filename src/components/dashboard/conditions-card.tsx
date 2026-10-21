"use client";

import { CalendarDays, Camera, Droplet, MapPin, Sun, Thermometer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/status";
import { RelativeTime } from "@/components/ui/time";
import { siteConfig } from "@/config/site";
import { conditionKeys, trolleyLayout } from "@/config/dashboard-layout";
import { useReadingByMetric } from "@/lib/api/queries";
import { formatDate, formatLongDate, formatReading, formatTime, formatUnit, stationCode } from "@/lib/format";
import { useConnectionState } from "@/lib/realtime/stomp";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/cn";
import { GreenhouseMap } from "./greenhouse-map";

function Clock() {
  const now = useNow();
  return (
    <div className="flex items-start gap-2 text-right text-sm text-ink-2" suppressHydrationWarning>
      <CalendarDays aria-hidden className="mt-0.5 hidden size-4 shrink-0 text-accent sm:block" strokeWidth={1.9} />
      <div>
      <p className="tabular hidden sm:block">{now ? formatLongDate(now) : " "}</p>
        <p className="tabular sm:hidden">{now ? formatDate(now) : " "}</p>
      <p className="tabular text-xs">{now ? `${formatTime(now, true)} WIB` : " "}</p>
      </div>
    </div>
  );
}

function SmallStat({ icon: Icon, label, metricKey, iconCls }: { icon: typeof Sun; label: string; metricKey: string; iconCls: string }) {
  const r = useReadingByMetric(metricKey);
  const v = formatReading(r);
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-2 text-sm text-ink-2">
        <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", iconCls)}>
          <Icon aria-hidden className="size-4" strokeWidth={2} />
        </span>
        {label}
      </p>
      <p className="tabular mt-1 pl-9 text-[clamp(1.25rem,6vw,1.625rem)] font-semibold whitespace-nowrap text-ink">
        {v ?? "—"}
        {v && r?.unit && <span className="ml-1 text-sm font-normal text-ink-2">{formatUnit(r.unit)}</span>}
      </p>
    </div>
  );
}

export function useTrolleyStation(): number | null {
  const r = useReadingByMetric(trolleyLayout.stationKey);
  return r?.value ?? null;
}

/** Kartu besar "Kondisi Greenhouse + Denah" — pengganti kartu cuaca di referensi. */
export function ConditionsCard() {
  const air = useReadingByMetric(conditionKeys.airTemperature);
  const station = useTrolleyStation();
  const stale = useConnectionState() !== "connected";
  const airValue = formatReading(air);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-ink">
          <MapPin aria-hidden className="size-5 shrink-0 text-accent" strokeWidth={2} />
          <span className="truncate">{siteConfig.location || "Lokasi belum diatur"}</span>
        </p>
        <Clock />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] sm:gap-5">
        <div className="flex min-w-0 flex-col">
          <p className="flex items-center gap-2 text-sm font-medium text-ink-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <Thermometer aria-hidden className="size-[18px]" strokeWidth={2} />
            </span>
            Suhu udara di dalam greenhouse
          </p>
          <p className={cn("tabular mt-3 flex items-start text-ink", stale && air && "opacity-60")}>
            <span className="metric-value text-[clamp(3.25rem,17vw,4.75rem)]">{airValue ?? "—"}</span>
            {airValue && air?.unit && <span className="mt-2 ml-0.5 text-3xl font-medium text-ink-2">{formatUnit(air.unit)}</span>}
          </p>
          <p className="mt-1 text-xs text-ink-2">{air ? <RelativeTime iso={air.recordedAt} prefix="diperbarui " /> : "belum ada data"}</p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-1">
            <SmallStat icon={Droplet} label="Kelembapan udara" metricKey={conditionKeys.airHumidity} iconCls="bg-info-soft text-info" />
            <SmallStat icon={Sun} label="Cahaya" metricKey={conditionKeys.illuminance} iconCls="bg-warn-soft text-warn" />
          </div>

          <div className="mt-auto flex flex-col items-start gap-2 pt-5">
            <Chip tone="ok" icon={Camera} className="px-3 py-1.5 text-[13px]">
              Kamera: {station == null ? "—" : stationCode(Math.round(station))}
            </Chip>
          </div>
        </div>
        <div className="self-center rounded-inner bg-gradient-to-b from-accent-soft/70 to-accent-soft/30 p-2 ring-1 ring-line">
          <GreenhouseMap trolleyStation={station} />
        </div>
      </div>
    </Card>
  );
}
