"use client";

import { ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { PicAirTemp, PicCamera, PicHumidity, PicLight, type Picto } from "@/components/icons/pictos";
import { Card } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/status";
import { RelativeTime } from "@/components/ui/time";
import { siteConfig } from "@/config/site";
import { conditionKeys, trolleyLayout } from "@/config/dashboard-layout";
import { useReadingByMetric } from "@/lib/api/queries";
import { formatLongDate, formatReading, formatTime, formatUnit, stationCode } from "@/lib/format";
import { useLocalChoice } from "@/lib/local-state";
import { useConnectionState } from "@/lib/realtime/stomp";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/cn";
import { GreenhouseMap } from "./greenhouse-map";

const MAP_KEY = "fertimata.dashboard.denah";

export function useTrolleyStation(): number | null {
  const r = useReadingByMetric(trolleyLayout.stationKey);
  return r?.value ?? null;
}

/** Kolom kanan atas: jam (pill), lokasi, tanggal. */
function TimePlace() {
  const now = useNow();
  return (
    <div className="flex min-w-0 flex-col items-start gap-2" suppressHydrationWarning>
      <span className="tabular rounded-full bg-accent-soft px-2 py-1 text-[11px] font-semibold whitespace-nowrap text-accent-ink sm:px-2.5 sm:text-xs">
        {now ? `${formatTime(now, true)} WIB` : " "}
      </span>
      <p className="flex min-w-0 items-start gap-1.5 text-[13px] leading-5 font-semibold text-ink">
        <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={2} />
        <span className="line-clamp-2 break-words">{siteConfig.location || "Lokasi belum diatur"}</span>
      </p>
      <p className="tabular hidden text-xs text-muted sm:block">{now ? formatLongDate(now) : " "}</p>
    </div>
  );
}

/*
 * Kartu kecil berwarna lembut + border halus. Warna hanya pembeda kelompok (air, cahaya, kamera),
 * bukan status. Angka diperkecil mengikuti lebar kartu supaya tiga kolom tetap muat di HP 360 px.
 */
const tints = {
  blue: "bg-tint-blue ring-tint-blue-line",
  yellow: "bg-tint-yellow ring-tint-yellow-line",
  violet: "bg-tint-violet ring-tint-violet-line",
};
const tileCls = "@container flex min-w-0 flex-col rounded-[16px] p-3 text-left ring-1 sm:p-3.5";

function TileTop({ icon: Icon, label }: { icon: Picto; label: string }) {
  return (
    <>
      <Icon className="size-7" />
      <p className="mt-2 min-h-8 text-xs leading-4 text-ink-2 @[8.5rem]:min-h-0 @[8.5rem]:text-[13px]">{label}</p>
    </>
  );
}

function ReadingTile({ icon, label, metricKey, tint, stale }: { icon: Picto; label: string; metricKey: string; tint: keyof typeof tints; stale: boolean }) {
  const r = useReadingByMetric(metricKey);
  const v = formatReading(r);
  return (
    <div className={cn(tileCls, tints[tint])}>
      <TileTop icon={icon} label={label} />
      <p className={cn("tabular mt-1.5 leading-tight font-semibold text-ink", stale && r && "opacity-60")}>
        <span className="text-[clamp(15px,19cqi,22px)]">{v ?? "—"}</span>
        {v && r?.unit && <span className="ml-1 text-[clamp(11px,11cqi,14px)] font-medium text-ink-2">{formatUnit(r.unit)}</span>}
      </p>
    </div>
  );
}

/**
 * Kartu utama Beranda "Kondisi greenhouse" (susunan mengikuti referensi): ikon bulat + suhu udara
 * besar di kiri, jam & lokasi di kanan dipisah garis tegak, lalu tiga kartu kecil berwarna lembut
 * (kelembapan udara, cahaya, posisi kamera). Kartu posisi kamera membuka/menutup denah greenhouse.
 * Tidak ada badge "Normal": backend tidak mengirim rentang acuan suhu/kelembapan/cahaya udara, jadi
 * yang ditampilkan hanya kapan angka diperbarui.
 */
export function ConditionsCard() {
  const air = useReadingByMetric(conditionKeys.airTemperature);
  const station = useTrolleyStation();
  const connection = useConnectionState();
  const stale = connection !== "connected";
  const airValue = formatReading(air);
  const [map, setMap] = useLocalChoice(MAP_KEY, ["open", "closed"] as const, "closed");
  const mapOpen = map === "open";

  return (
    <Card className="shadow-float md:shadow-card">
      <div className="flex gap-3 sm:gap-5">
        <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft min-[400px]:size-14 sm:size-16">
            <PicAirTemp className="size-7 min-[400px]:size-9 sm:size-10" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-ink">Suhu udara</p>
            <p className={cn("tabular mt-0.5 flex items-start text-ink", stale && air && "opacity-60")}>
              <span className="metric-value text-[clamp(2.25rem,11vw,3.75rem)]">{airValue ?? "—"}</span>
              {airValue && air?.unit && <span className="mt-1 ml-0.5 text-lg font-medium text-ink-2 sm:text-2xl">{formatUnit(air.unit)}</span>}
            </p>
            <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-card-2 px-2.5 py-1 text-xs text-ink-2 ring-1 ring-line">
              <StatusDot tone={air && !stale ? "ok" : "neutral"} className="size-1.5" />
              <span className="truncate">{air ? <RelativeTime iso={air.recordedAt} /> : "belum ada data"}</span>
            </span>
          </div>
        </div>
        <div className="w-[34%] max-w-48 shrink-0 border-l border-line pl-3 sm:pl-5">
          <TimePlace />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        <ReadingTile icon={PicHumidity} label="Kelembapan udara" metricKey={conditionKeys.airHumidity} tint="blue" stale={stale} />
        <ReadingTile icon={PicLight} label="Cahaya" metricKey={conditionKeys.illuminance} tint="yellow" stale={stale} />
        <button
          type="button"
          onClick={() => setMap(mapOpen ? "closed" : "open")}
          aria-expanded={mapOpen}
          aria-controls="denah-beranda"
          className={cn(
            tileCls,
            tints.violet,
            "transition hover:ring-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          )}
        >
          <TileTop icon={PicCamera} label="Posisi kamera" />
          <span className="tabular mt-1.5 flex items-center gap-0.5 leading-tight font-semibold text-ink">
            <span className="text-[clamp(15px,19cqi,22px)]">{station == null ? "—" : stationCode(Math.round(station))}</span>
            {mapOpen ? (
              <ChevronDown aria-hidden className="size-4 shrink-0 text-accent-ink" strokeWidth={2.2} />
            ) : (
              <ChevronRight aria-hidden className="size-4 shrink-0 text-accent-ink" strokeWidth={2.2} />
            )}
          </span>
          <span className="sr-only">{mapOpen ? "Tutup denah greenhouse" : "Buka denah greenhouse"}</span>
        </button>
      </div>

      {mapOpen && (
        <div id="denah-beranda" className="mt-3 rounded-[16px] bg-card-2 p-2 ring-1 ring-line">
          <p className="px-1.5 pt-1 pb-1 text-xs text-muted">Denah greenhouse · posisi kereta kamera</p>
          <GreenhouseMap trolleyStation={station} />
        </div>
      )}
    </Card>
  );
}
