"use client";

import { useCallback, useSyncExternalStore } from "react";

/*
 * Preferensi kecil per-perangkat (plot terpilih, dll.) di localStorage. Aman bila storage
 * tidak tersedia: nilai bawaan dipakai dan perubahan hanya berlaku di memori.
 */

const memory = new Map<string, string>();
const EVENT = "fertimata:local-state";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useLocalChoice<T extends string>(key: string, allowed: readonly T[], fallback: T): [T, (v: T) => void] {
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);
  const value = raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
  const set = useCallback(
    (v: T) => {
      memory.set(key, v);
      try {
        localStorage.setItem(key, v);
      } catch {
        // abaikan
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );
  return [value, set];
}
