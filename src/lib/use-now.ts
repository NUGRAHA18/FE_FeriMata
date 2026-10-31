"use client";

import { useSyncExternalStore } from "react";

// Satu ticker bersama (bukan puluhan setInterval); hanya komponen pemakai hook ini yang re-render tiap detik.

const listeners = new Set<() => void>();
let now = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(l: () => void) {
  listeners.add(l);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((fn) => fn());
    }, 1000);
  }
  return () => {
    listeners.delete(l);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Waktu sekarang (ms), diperbarui tiap detik. 0 saat render server — tampilkan placeholder. */
export function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => now || (now = Date.now()),
    () => 0,
  );
}
