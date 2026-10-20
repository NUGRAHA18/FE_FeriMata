import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CornerLink } from "./card";
import { Badge, type Tone } from "./status";

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
  /** Kartu "hero" berwarna. */
  tone?: "default" | "accent" | "warn" | "danger";
  badge?: ReactNode;
  /** Badge penilaian nilai; hanya diisi bila ada rentang acuan dari backend. */
  status?: MetricStatus | null;
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
 * Kartu angka sensor. Dibuat besar dan lapang: ikon dalam lingkaran berwarna, label yang mudah
 * dibaca, angka besar, satuan di sampingnya, dan satu baris keterangan kapan terakhir diperbarui.
 * Ukuran minimum dipilih agar tetap terbaca di ponsel dari jarak satu lengan.
 */
export function MetricCard({ label, icon: Icon, value, unit, hint, href, tone = "default", badge, status, stale, compact, className }: MetricCardProps) {
  const colored = tone !== "default";
  // Angka panjang (mis. EC "1.242 µS/cm") sedikit diperkecil agar tidak meluap dari kartu.
  const long = (value?.length ?? 0) + (unit?.length ?? 0) > 8;
  return (
    <section
      aria-label={label}
      className={cn(
        "relative flex min-w-0 flex-col rounded-card shadow-card",
        compact ? "p-3.5" : "p-4 sm:p-5",
        toneClass[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "grid shrink-0 place-items-center rounded-full",
            compact ? "size-9" : "size-10 sm:size-11",
            colored ? "bg-white/20 text-current" : "bg-accent-soft text-accent",
          )}
        >
          <Icon aria-hidden className={cn(compact ? "size-[18px]" : "size-5 sm:size-[22px]")} strokeWidth={1.8} />
        </span>
        {href && (
          <CornerLink
            href={href}
            label={`Lihat detail ${label}`}
            className={cn(colored && "bg-white/20 text-current hover:bg-white/30 hover:text-current", "size-8 sm:size-9")}
          />
        )}
      </div>
      <p className={cn("mt-3 line-clamp-2 font-medium leading-snug", compact ? "text-sm" : "text-sm sm:text-base", colored ? "opacity-95" : "text-ink-2")}>
        {label}
      </p>
      <div className={cn("flex flex-wrap items-end gap-x-2 gap-y-1", compact ? "mt-1.5" : "mt-2 sm:mt-3")}>
        <p className={cn("tabular flex items-baseline", stale && "opacity-60")}>
          <span
            className={cn(
              "metric-value font-normal",
              long
                ? compact
                  ? "text-[clamp(1.375rem,6.5vw,1.625rem)]"
                  : "text-[clamp(1.5rem,7vw,2.75rem)]"
                : compact
                  ? "text-[clamp(1.625rem,8vw,2rem)]"
                  : "text-[clamp(2rem,9.5vw,3.375rem)]",
            )}
          >
            {value ?? "—"}
          </span>
          {value != null && unit && (
            <span className={cn("ml-1 font-normal", compact ? "text-base" : "text-base sm:text-2xl", colored ? "opacity-80" : "text-muted")}>
              {unit}
            </span>
          )}
        </p>
        {badge}
      </div>
      {status && !colored && (
        <Badge tone={status.tone} className="mt-2 self-start text-xs">
          {status.label}
        </Badge>
      )}
      {hint && (
        <p className={cn("mt-auto truncate pt-2 text-xs sm:pt-3 sm:text-[13px]", colored ? "opacity-90" : "text-ink-2")}>{hint}</p>
      )}
    </section>
  );
}
