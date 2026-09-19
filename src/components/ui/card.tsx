import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-card bg-card p-4 shadow-card sm:p-5", className)} {...props} />;
}

/** Item di dalam kartu (baris perangkat, aktivitas, dll.) — satu tingkat lebih terang. */
export function Inset({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-inner bg-card-2 p-3.5", className)} {...props} />;
}

type CardHeaderProps = {
  title: ReactNode;
  icon?: LucideIcon;
  /** Tautan detail — dirender sebagai tombol persegi kecil ↗ di pojok kanan atas. */
  href?: string;
  hrefLabel?: string;
  action?: ReactNode;
  className?: string;
};

export function CardHeader({ title, icon: Icon, href, hrefLabel, action, className }: CardHeaderProps) {
  return (
    <div className={cn("mb-3 flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-2">
        {Icon && <Icon aria-hidden className="size-4 shrink-0 text-ink-2" strokeWidth={1.6} />}
        <h2 className="truncate text-[15px] font-medium text-ink">{title}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        {href && <CornerLink href={href} label={hrefLabel ?? `Buka ${typeof title === "string" ? title : "detail"}`} />}
      </div>
    </div>
  );
}

export function CornerLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-8 place-items-center rounded-[10px] bg-card-2 text-ink-2 transition hover:bg-active hover:text-active-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
    >
      <ArrowUpRight aria-hidden className="size-4" strokeWidth={1.6} />
    </Link>
  );
}
