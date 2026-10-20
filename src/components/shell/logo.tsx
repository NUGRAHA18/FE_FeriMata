import Link from "next/link";
import { Sprout } from "lucide-react";
import { productName } from "@/config/site";
import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${productName} — Beranda`}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-2 to-accent text-accent-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Daun Melon / Tanaman Cerdas */}
        <path d="M12 3v10M12 13c-3.5 0-7-2-7-6 0 5 3.5 8 7 8s7-3 7-8c0 4-3.5 6-7 6z" />
        <path d="M12 13v3" />
        {/* Gelombang Fertigasi / Nutrisi Air di bagian bawah */}
        <path d="M3 19c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0" />
        <path d="M3 22c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0" />
      </svg>
    </Link>
  );
}
