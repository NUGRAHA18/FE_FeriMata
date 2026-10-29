import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CornerLink } from "./card";
import { Badge, softTone, type Tone } from "./status";

/** Penilaian nilai terhadap rentang acuan, mis. { tone: "ok", label: "Sesuai target" }. */
export type MetricStatus = { tone: Tone; label: string };

type MetricCardProps = {
  label: string;
  icon: LucideIcon;
  /** Nilai sudah terformat; null → "—". */
  value: string | null;
  unit?: string | null;
  /** Satu baris teks bantu (mis. "diperbarui 12 dtk lalu"). */
  hint?: ReactNode;
  href?: string;
  /** Nada kartu: mewarnai kotak ikon saja; kartunya tetap putih seperti kartu lain. */
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
 * Kartu angka sensor: kotak ikon + tautan detail di atas, label, angka besar (fokus utama), satuan
 * lebih kecil, badge penilaian, lalu satu baris keterangan. Semua kartu putih dengan susunan sama;
 * status hanya mewarnai kotak ikon dan badge. Angka tetap terbaca di ponsel dari jarak satu lengan.
 */
export function MetricCard({ label, icon: Icon, value, unit, hint, href, tone = "default", badge, status, stale, compact, className }: MetricCardProps) {
  // Angka panjang (mis. EC "1.242 µS/cm") sedikit diperkecil agar tidak meluap dari kartu.
  const long = (value?.length ?? 0) + (unit?.length ?? 0) > 8;
  return (
    <section
      aria-label={label}
      className={cn(
        "@container relative flex min-w-0 flex-col overflow-hidden rounded-card bg-card text-ink shadow-card ring-1 ring-line",
        compact ? "p-3.5" : "p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("grid shrink-0 place-items-center rounded-[12px]", compact ? "size-9" : "size-10", softTone[iconTone[tone]])}>
          <Icon aria-hidden className={cn(compact ? "size-[18px]" : "size-5")} strokeWidth={1.8} />
        </span>
        {href && <CornerLink href={href} label={`Lihat detail ${label}`} />}
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
    </section>
  );
}
