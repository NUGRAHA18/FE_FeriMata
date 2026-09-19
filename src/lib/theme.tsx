"use client";

import { useCallback, useSyncExternalStore } from "react";
import { THEME_COLORS, THEME_STORAGE_KEY, THEMES, type ResolvedTheme } from "./theme-key";

export type ThemePreference = ResolvedTheme | "system";

export const themeLabels: Record<ThemePreference, string> = {
  light: "Terang",
  dark: "Gelap",
  green: "Hijau",
  system: "Ikuti sistem",
};

const CHANGE_EVENT = "fertimata:theme";

function isTheme(v: unknown): v is ResolvedTheme {
  return (THEMES as readonly unknown[]).includes(v);
}

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(v) ? v : "system";
  } catch {
    return "system";
  }
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readResolved(): ResolvedTheme {
  const t = document.documentElement.dataset.theme;
  return isTheme(t) ? t : "light";
}

function apply(pref: ThemePreference) {
  const theme = pref === "system" ? systemTheme() : pref;
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = THEME_COLORS[theme];
  });
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => {
    apply(readPreference());
    onChange();
  };
  mq.addEventListener("change", onSystem);
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onSystem);
  return () => {
    mq.removeEventListener("change", onSystem);
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onSystem);
  };
}

/** Menyelaraskan meta theme-color dengan tema yang dipasang skrip awal. Dipanggil sekali di Providers. */
export function syncThemeColor() {
  apply(readPreference());
}

/** Preferensi tema. Atribut data-theme awal dipasang skrip inline di layout.tsx. */
export function useTheme() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as const);
  const resolved = useSyncExternalStore(subscribe, readResolved, () => "light" as const);

  const setPreference = useCallback((p: ThemePreference) => {
    try {
      if (p === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, p);
    } catch {
      // Penyimpanan tidak tersedia: tema tetap berlaku untuk sesi ini.
    }
    apply(p);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  /** Terang → Gelap → Hijau → Terang (untuk tombol cepat). */
  const cycle = useCallback(() => {
    const i = THEMES.indexOf(readResolved());
    setPreference(THEMES[(i + 1) % THEMES.length]);
  }, [setPreference]);

  return { preference, resolved, setPreference, cycle };
}
