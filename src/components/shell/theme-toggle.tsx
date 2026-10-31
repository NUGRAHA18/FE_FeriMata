"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/cn";
import { themeLabels, useTheme, type ThemePreference } from "@/lib/theme";

const icons = { light: Sun, dark: Moon, system: Monitor };
const next = { light: "dark", dark: "light" } as const;

/** Tombol cepat: Terang ↔ Gelap. Ikon menunjukkan tema yang sedang aktif. */
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
        "grid size-12 shrink-0 place-items-center rounded-[14px] bg-card text-ink-2 shadow-card ring-1 ring-line transition hover:bg-card-2",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
    >
      <Icon aria-hidden className="size-[19px]" strokeWidth={2} />
    </button>
  );
}

const options: ThemePreference[] = ["light", "dark", "system"];

/** Pemilih tema lengkap (Pengaturan & menu Lainnya). Ponsel: tiga kolom selebar layar. */
export function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();
  return (
    <Segmented
      label="Tema tampilan"
      value={preference}
      onChange={setPreference}
      className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto"
      options={options.map((v) => ({ value: v, label: themeLabels[v], icon: icons[v] }))}
    />
  );
}
