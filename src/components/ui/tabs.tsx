"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

type TabsProps<T extends string> = { value: T; onChange: (v: T) => void; tabs: { value: T; label: string }[]; label: string; className?: string };

/** Tab bergaris bawah (gaya layar Analytic referensi); navigasi panah kiri/kanan. */
export function Tabs<T extends string>({ value, onChange, tabs, label, className }: TabsProps<T>) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const n = (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    onChange(tabs[n].value);
    refs.current[n]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={cn("scroll-thin flex gap-5 overflow-x-auto border-b border-line", className)}>
      {tabs.map((t, i) => {
        const sel = t.value === value;
        return (
          <button
            key={t.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${base}-${t.value}`}
            type="button"
            role="tab"
            aria-selected={sel}
            tabIndex={sel ? 0 : -1}
            onClick={() => onChange(t.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "relative shrink-0 pb-3 text-sm font-medium whitespace-nowrap transition focus-visible:outline-none focus-visible:[&>span]:text-accent",
              sel ? "text-ink" : "text-muted hover:text-ink-2",
            )}
          >
            <span>{t.label}</span>
            {sel && <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-ink" />}
          </button>
        );
      })}
    </div>
  );
}
