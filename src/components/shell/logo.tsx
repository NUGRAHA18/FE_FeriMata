import Link from "next/link";
import { Sprout } from "lucide-react";
import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Smart Melon — Beranda"
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent-2 to-accent text-accent-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]",
        className,
      )}
    >
      <Sprout aria-hidden className="size-5" strokeWidth={1.8} />
    </Link>
  );
}
