import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, Info, OctagonAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type Tone = "ok" | "warn" | "danger" | "info" | "neutral";

const dotTone: Record<Tone, string> = {
  ok: "bg-success",
  warn: "bg-warn",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-muted",
};

/** Titik status. Selalu dampingi dengan teks — warna saja tidak cukup. */
export function StatusDot({ tone, pulse, className }: { tone: Tone; pulse?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", dotTone[tone], pulse && "animate-pulse-dot", className)}
    />
  );
}

/** Latar lembut + teks gelap setema (kontras ≥ 4.5:1 di ketiga tema). Dipakai Chip, Badge, ikon status. */
export const softTone: Record<Tone, string> = {
  ok: "bg-accent-soft text-accent-ink",
  warn: "bg-warn-soft text-warn-ink",
  danger: "bg-danger-soft text-danger-ink",
  info: "bg-info-soft text-info-ink",
  neutral: "bg-sunken text-ink-2",
};
const chipTone = softTone;

const chipIcon: Partial<Record<Tone, LucideIcon>> = {
  warn: AlertTriangle,
  danger: OctagonAlert,
  info: Info,
};

type ChipProps = ComponentProps<"span"> & { tone?: Tone; icon?: LucideIcon | false; children: ReactNode };

export function Chip({ tone = "neutral", icon, className, children, ...props }: ChipProps) {
  const Icon = icon === false ? null : (icon ?? chipIcon[tone]);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium",
        chipTone[tone],
        className,
      )}
      {...props}
    >
      {Icon && <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.8} />}
      <span className="truncate">{children}</span>
    </span>
  );
}

/**
 * Badge status (tidak bisa diklik, jadi tidak boleh mirip tombol): pill ringkas, titik + teks.
 * `dot={false}` untuk label yang bukan status (mis. nama perlakuan).
 */
export function Badge({ tone = "neutral", dot = false, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] leading-4 font-medium", chipTone[tone], className)}>
      {dot && <StatusDot tone={tone} className="size-1.5" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Status satu baris: "● Terhubung · 34 detik lalu". Warna + teks + titik, tidak hanya warna. */
const statusText: Record<Tone, string> = {
  ok: "text-accent-ink",
  warn: "text-warn-ink",
  danger: "text-danger-ink",
  info: "text-info-ink",
  neutral: "text-ink-2",
};
export function StatusLine({ tone, label, pulse, children, className }: { tone: Tone; label: string; pulse?: boolean; children?: ReactNode; className?: string }) {
  return (
    <p className={cn("flex min-w-0 items-center gap-1.5 text-xs text-muted", className)}>
      <StatusDot tone={tone} pulse={pulse} />
      <span className={cn("shrink-0 font-semibold", statusText[tone])}>{label}</span>
      {children && (
        <>
          <span aria-hidden>·</span>
          <span className="min-w-0 truncate">{children}</span>
        </>
      )}
    </p>
  );
}
