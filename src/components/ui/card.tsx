import Link from "next/link";
import { ArrowUpRight, ChevronRight, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps = ComponentProps<"section"> & {
  /** Ponsel: tanpa kartu pembungkus — judul seksi dan isinya langsung di latar halaman. Tablet ke atas tetap kartu. */
  mobileBare?: boolean;
};

export function Card({ className, mobileBare, ...props }: CardProps) {
  return (
    <section
      className={cn(
        "relative rounded-card bg-card p-4 shadow-card ring-1 ring-line sm:p-5",
        mobileBare && "max-md:rounded-none max-md:bg-transparent max-md:p-0 max-md:shadow-none max-md:ring-0",
        className,
      )}
      {...props}
    />
  );
}

/** Item di dalam kartu (baris perangkat, aktivitas, dll.) — satu tingkat lebih terang. */
export function Inset({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-inner bg-card-2 p-3.5 ring-1 ring-line", className)} {...props} />;
}

type CardHeaderProps = {
  title: ReactNode;
  icon?: LucideIcon;
  /** Tautan detail — dirender sebagai tombol persegi kecil ↗ di pojok kanan atas. */
  href?: string;
  hrefLabel?: string;
  action?: ReactNode;
  /** Pasangan Card `mobileBare`: di ponsel tampil sebagai judul seksi + tautan teks "Lihat semua". */
  mobileSection?: boolean;
  className?: string;
};

export function CardHeader({ title, icon: Icon, href, hrefLabel, action, mobileSection, className }: CardHeaderProps) {
  const label = hrefLabel ?? `Buka ${typeof title === "string" ? title : "detail"}`;
  return (
    <div className={cn("mb-3 flex items-start justify-between gap-3", mobileSection && "max-md:items-center", className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && <Icon aria-hidden className={cn("size-5 shrink-0 text-accent", mobileSection && "max-md:hidden")} strokeWidth={2} />}
        <h2 className={cn("truncate text-base font-semibold text-ink", mobileSection && "max-md:text-[17px]")}>{title}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        {href && mobileSection && <SectionLink href={href} label={label} className="md:hidden" />}
        {href && <CornerLink href={href} label={label} className={cn(mobileSection && "hidden md:grid")} />}
      </div>
    </div>
  );
}

/** Tautan teks kecil di kanan judul seksi ("Lihat semua ›"). */
export function SectionLink({ href, label, text = "Lihat semua", className }: { href: string; label?: string; text?: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "-mr-1.5 inline-flex h-8 shrink-0 items-center gap-0.5 rounded-[8px] px-1.5 text-[13px] font-semibold text-accent-ink transition hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
    >
      {text}
      <ChevronRight aria-hidden className="size-4" strokeWidth={2} />
    </Link>
  );
}

/**
 * Judul seksi di luar kartu: judul di kiri, tautan opsional di kanan, isi tepat di bawahnya.
 * Dipakai untuk kelompok kartu (mis. grid angka sensor) yang tidak perlu dibungkus kartu lagi.
 */
export function SectionHeader({ id, title, href, linkLabel, className }: { id?: string; title: ReactNode; href?: string; linkLabel?: string; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3 md:mb-3.5", className)}>
      <h2 id={id} className="truncate text-[17px] font-semibold text-ink">
        {title}
      </h2>
      {href && <SectionLink href={href} text={linkLabel} />}
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
        // Navigasi kecil, bukan aksi utama: transparan, ikon hijau tua, hover hijau sangat muda.
        "grid size-8 shrink-0 place-items-center rounded-[10px] text-accent-ink ring-1 ring-line transition hover:bg-accent-soft hover:ring-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
    >
      <ArrowUpRight aria-hidden className="size-4" strokeWidth={2} />
    </Link>
  );
}
