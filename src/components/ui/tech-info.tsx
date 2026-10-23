"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useLocalChoice } from "@/lib/local-state";

const SIMPLE_MODE_KEY = "fertimata.simple-mode";

/** Mode sederhana: panel "Info teknis" (kode, metric key, Modbus) disembunyikan sepenuhnya. */
export function useSimpleMode(): [boolean, (on: boolean) => void] {
  const [v, set] = useLocalChoice(SIMPLE_MODE_KEY, ["on", "off"] as const, "off");
  return [v === "on", (on) => set(on ? "on" : "off")];
}

/** Panel lipat "Info teknis". Tidak dirender sama sekali saat mode sederhana aktif. */
export function TechInfo({ className, children }: { className?: string; children: ReactNode }) {
  const [simple] = useSimpleMode();
  if (simple) return null;
  return (
    <details className={cn("rounded-inner bg-card-2 px-3.5 py-2 text-sm ring-1 ring-line", className)}>
      <summary className="cursor-pointer font-medium text-ink-2">Info teknis</summary>
      {children}
    </details>
  );
}
