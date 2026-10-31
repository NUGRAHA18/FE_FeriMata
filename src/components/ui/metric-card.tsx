import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { pictoTile, type Picto } from "@/components/icons/pictos";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Badge, softTone, type Tone } from "./status";

/** Penilaian nilai terhadap rentang acuan, mis. { tone: "ok", label: "Sesuai target" }. */
export type MetricStatus = { tone: Tone; label: string };

type MetricCardProps = {
  label: string;
  /** Piktogram benda yang diukur (components/icons/pictos). */
  icon: Picto;
  /** Nilai sudah terformat; null → "—". */
  value: string | null;
  unit?: string | null;
  /** Satu baris teks bantu (mis. "diperbarui 12 dtk lalu"). */
  hint?: ReactNode;
  href?: string;
  /** Nada kartu: warn/danger mewarnai kotak ikon saja; kartunya tetap putih seperti kartu lain. */
  tone?: "default" | "accent" | "warn" | "danger";
  badge?: ReactNode;
  /** Badge penilaian nilai; hanya diisi bila ada rentang acuan dari backend. */
  status?: MetricStatus | null;
  stale?: boolean;
  compact?: boolean;
  className?: string;
};

const iconTone: Record<NonNullable<MetricCardProps["tone"]>, Tone> = { default: "ok", accent: "ok", warn: "warn", danger: "danger" };

/**
 * Kartu angka sensor: kotak ikon di atas, label, angka besar (fokus utama), satuan lebih kecil, badge
 * penilaian, lalu satu baris keterangan. Semua kartu putih dengan susunan sama; status hanya mewarnai
 * kotak ikon dan badge. Dengan `href` seluruh kartu menjadi tautan (panah kecil di pojok sebagai
 * penanda), jadi grid tidak dipenuhi tombol panah terpisah.
 */
export function MetricCard({ label, icon: Icon, value, unit, hint, href, tone = "default", badge, status, stale, compact, className }: MetricCardProps) {
  // Angka panjang (mis. EC "1.242 µS/cm") sedikit diperkecil agar tidak meluap dari kartu.
  const long = (value?.length ?? 0) + (unit?.length ?? 0) > 8;
  const cls = cn(
    "@container relative flex min-w-0 flex-col overflow-hidden rounded-card bg-card text-ink shadow-card ring-1 ring-line",
    compact ? "p-3.5" : "p-4 sm:p-5",
    href && "transition hover:ring-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    className,
  );
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className={cn(pictoTile, compact ? "size-10" : "size-12", (tone === "warn" || tone === "danger") && cn(softTone[iconTone[tone]], "ring-0"))}>
          <Icon className={compact ? "size-7" : "size-8"} />
        </span>
        {href && <ChevronRight aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" strokeWidth={2} />}
      </div>
      <p className={cn("mt-3 line-clamp-2 leading-snug font-semibold text-ink-2", compact ? "text-sm" : "text-sm sm:text-[15px]")}>
        {label}
      </p>
      <div className={cn("flex flex-wrap items-end gap-x-2 gap-y-1", compact ? "mt-1.5" : "mt-2 sm:mt-3")}>
        <p className={cn("tabular flex flex-wrap items-baseline", stale && "opacity-60")}>
          <span
            className={cn(
              "metric-value",
              long
                ? compact
                  ? "text-[clamp(1.375rem,17cqi,1.625rem)]"
                  : "text-[clamp(1.5rem,21cqi,2.75rem)]"
                : compact
                  ? "text-[clamp(1.625rem,22cqi,2rem)]"
                  : "text-[clamp(2rem,30cqi,3.375rem)]",
            )}
          >
            {value ?? "—"}
          </span>
          {value != null && unit && (
            <span className={cn("ml-1 font-medium text-muted", compact ? "text-sm" : "text-sm sm:text-lg")}>
              {unit}
            </span>
          )}
        </p>
        {badge}
      </div>
      {status && (
        <Badge tone={status.tone} dot className="mt-2 self-start text-xs">
          {status.label}
        </Badge>
      )}
      {hint && <p className="mt-auto truncate pt-2 text-xs text-muted sm:pt-3 sm:text-[13px]">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} aria-label={`${label}: ${value ?? "belum ada data"}${value && unit ? ` ${unit}` : ""} — lihat detail`} className={cls}>
      {body}
    </Link>
  ) : (
    <section aria-label={label} className={cls}>
      {body}
    </section>
  );
}
