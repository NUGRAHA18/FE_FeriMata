import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, Info, OctagonAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type Tone = "ok" | "warn" | "danger" | "info" | "neutral";

const dotTone: Record<Tone, string> = {
  ok: "bg-accent",
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

const chipTone: Record<Tone, string> = {
  ok: "bg-accent-soft text-accent",
  warn: "bg-warn-soft text-warn-ink",
  danger: "bg-danger-soft text-danger-ink",
  info: "bg-info-soft text-info",
  neutral: "bg-sunken text-ink-2",
};

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

/** Badge kecil berbentuk pill (mis. "Good" di referensi). */
export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", chipTone[tone], className)}>
      {children}
    </span>
  );
}
