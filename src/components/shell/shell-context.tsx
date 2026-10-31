"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ConnectionState } from "@/lib/realtime/stomp";

export type { ConnectionState };

/** Tempat di kepala hijau (ponsel) yang diisi PageHeader lewat portal: kiri-atas, judul, kontrol halaman. */
export type HeroSlotKey = "lead" | "title" | "actions";
type HeroSlots = Record<HeroSlotKey, HTMLElement | null>;

type ShellContextValue = {
  heroSlots: HeroSlots;
  setHeroSlot: (key: HeroSlotKey, el: HTMLElement | null) => void;
  alertCount: number;
  connection: ConnectionState;
  alertDrawerOpen: boolean;
  openAlertDrawer: () => void;
  closeAlertDrawer: () => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

type ShellProviderProps = {
  alertCount: number;
  connection: ConnectionState;
  children: ReactNode;
};

export function ShellProvider({ alertCount, connection, children }: ShellProviderProps) {
  const [alertDrawerOpen, setOpen] = useState(false);
  const [heroSlots, setSlots] = useState<HeroSlots>({ lead: null, title: null, actions: null });
  const setHeroSlot = useCallback((key: HeroSlotKey, el: HTMLElement | null) => setSlots((s) => (s[key] === el ? s : { ...s, [key]: el })), []);
  const value = useMemo(
    () => ({
      heroSlots,
      setHeroSlot,
      alertCount,
      connection,
      alertDrawerOpen,
      openAlertDrawer: () => setOpen(true),
      closeAlertDrawer: () => setOpen(false),
    }),
    [heroSlots, setHeroSlot, alertCount, connection, alertDrawerOpen],
  );
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell harus dipakai di dalam ShellProvider");
  return ctx;
}
