"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type SegmentedOption<T extends string> = { value: T; label: string; icon?: LucideIcon };

type SegmentedProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  label: string;
  size?: "sm" | "md";
  className?: string;
};

/** Segmented control: opsi terpilih berlatar "active" (hitam / hijau tua pada mode Hijau). */
export function Segmented<T extends string>({ value, onChange, options, label, size = "md", className }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-control bg-card-2 p-1", className)}>
      {options.map((o) => {
        const selected = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-[9px] font-medium whitespace-nowrap transition",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-sm",
              selected ? "bg-active text-active-fg" : "text-ink-2 hover:bg-sunken",
            )}
          >
            {Icon && <Icon aria-hidden className="size-4" strokeWidth={1.7} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
