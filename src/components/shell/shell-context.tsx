"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ConnectionState } from "@/lib/realtime/stomp";

export type { ConnectionState };

type ShellContextValue = {
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
  const value = useMemo(
    () => ({
      alertCount,
      connection,
      alertDrawerOpen,
      openAlertDrawer: () => setOpen(true),
      closeAlertDrawer: () => setOpen(false),
    }),
    [alertCount, connection, alertDrawerOpen],
  );
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell harus dipakai di dalam ShellProvider");
  return ctx;
}
