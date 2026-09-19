import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CornerLink } from "./card";

type MetricCardProps = {
  label: string;
  icon: LucideIcon;
  /** Nilai sudah terformat; null → "—". */
  value: string | null;
  unit?: string | null;
  /** Satu baris teks bantu (mis. "diperbarui 12 dtk lalu"). */
  hint?: ReactNode;
  href?: string;
  /** Kartu "hero" hijau. */
  tone?: "default" | "accent" | "warn" | "danger";
  badge?: ReactNode;
  stale?: boolean;
  compact?: boolean;
  className?: string;
};

const toneClass = {
  default: "bg-card text-ink",
  accent: "bg-gradient-to-br from-accent-2 to-accent text-accent-fg",
  warn: "bg-gradient-to-br from-[#f0b93f] to-warn text-white",
  danger: "bg-gradient-to-br from-[#ea6a5f] to-danger text-white",
};

/**
 * Kartu metrik gaya referensi: ikon garis kiri atas, tombol ↗ kanan atas, label,
 * nilai besar & tipis dengan satuan kecil abu-abu, satu baris teks bantu.
 */
export function MetricCard({ label, icon: Icon, value, unit, hint, href, tone = "default", badge, stale, compact, className }: MetricCardProps) {
  const colored = tone !== "default";
  // Angka panjang (mis. EC "1.242 µS/cm") diperkecil agar tidak meluap dari kartu.
  const long = (value?.length ?? 0) + (unit?.length ?? 0) > 7;
  return (
    <section
      aria-label={label}
      className={cn(
        "relative flex min-w-0 flex-col rounded-card shadow-card",
        compact ? "p-3" : "p-3 sm:p-5",
        toneClass[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Icon aria-hidden className={cn("mt-1 size-4 shrink-0 sm:size-[18px]", colored ? "opacity-90" : "text-ink-2")} strokeWidth={1.5} />
        {href && (
          <CornerLink
            href={href}
            label={`Detail ${label}`}
            className={cn(colored && "bg-white/20 text-current hover:bg-white/30 hover:text-current", compact ? "size-7" : "size-7 sm:size-8")}
          />
        )}
      </div>
      <p className={cn("mt-2 line-clamp-2 font-medium", compact ? "text-xs" : "text-xs sm:text-sm", colored ? "opacity-95" : "text-ink-2")}>
        {label}
      </p>
      <div className={cn("flex flex-wrap items-end gap-x-2 gap-y-1", compact ? "mt-2" : "mt-2 sm:mt-4")}>
        <p className={cn("tabular flex items-baseline", stale && "opacity-60")}>
          <span className={cn("metric-value", long ? (compact ? "text-[22px]" : "text-[22px] sm:text-4xl") : compact ? "text-[28px]" : "text-[28px] sm:text-5xl")}>
            {value ?? "—"}
          </span>
          {value != null && unit && (
            <span className={cn("ml-0.5 font-light", compact ? "text-sm" : "text-sm sm:text-xl", colored ? "opacity-75" : "text-muted")}>
              {unit}
            </span>
          )}
        </p>
        {badge}
      </div>
      {hint && (
        <p className={cn("mt-auto truncate pt-2 text-[11px] sm:pt-3 sm:text-xs", colored ? "opacity-85" : "text-muted")}>{hint}</p>
      )}
    </section>
  );
}
