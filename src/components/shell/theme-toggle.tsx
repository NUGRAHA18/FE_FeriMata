"use client";

import { Leaf, Monitor, Moon, Sun } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/cn";
import { themeLabels, useTheme, type ThemePreference } from "@/lib/theme";

const icons = { light: Sun, dark: Moon, green: Leaf, system: Monitor };
const next = { light: "dark", dark: "green", green: "light" } as const;

/** Tombol cepat: Terang → Gelap → Hijau. Ikon menunjukkan tema yang sedang aktif. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, cycle } = useTheme();
  const Icon = icons[resolved];
  const label = `Tema: ${themeLabels[resolved]} — ganti ke ${themeLabels[next[resolved]]}`;
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-12 shrink-0 place-items-center rounded-[14px] bg-card text-ink-2 transition hover:bg-card-2",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
    >
      <Icon aria-hidden className="size-[19px]" strokeWidth={1.6} />
    </button>
  );
}

const options: ThemePreference[] = ["light", "dark", "green", "system"];

/** Pemilih tema lengkap untuk halaman Pengaturan. */
export function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();
  return (
    <Segmented
      label="Tema tampilan"
      value={preference}
      onChange={setPreference}
      options={options.map((v) => ({ value: v, label: themeLabels[v], icon: icons[v] }))}
    />
  );
}
