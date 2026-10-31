"use client";

import { onlineManager, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { qk } from "@/lib/api/query-keys";
import type { DashboardOverview } from "@/lib/api/types";
import { mergeReadings, type ReadingMap } from "@/lib/realtime/apply";
import type { ConnectionState } from "@/lib/realtime/stomp";
import { loadSnapshot, saveSnapshot } from "./snapshot";

const LIVE_SAVE_INTERVAL_MS = 60_000;

/** `updatedAt` = waktu snapshot disimpan, jadi data langsung basi dan overview diambil ulang begitu
 *  ada jaringan. */
export function hydrateFromSnapshot(qc: QueryClient, username: string): boolean {
  if (qc.getQueryData(qk.overview)) return false;
  const s = loadSnapshot(username);
  if (!s) return false;
  qc.setQueryData(qk.overview, s.overview, { updatedAt: s.savedAt });
  qc.setQueryData<ReadingMap>(qk.readings, (prev) => mergeReadings(prev, s.overview.sensors.latestReadings), { updatedAt: s.savedAt });
  return true;
}

/** Overview + pembacaan terbaru (termasuk yang tiba lewat WebSocket) sebagai satu snapshot. */
function snapshotOf(qc: QueryClient): DashboardOverview | undefined {
  const o = qc.getQueryData<DashboardOverview>(qk.overview);
  if (!o) return undefined;
  const readings = Object.values(qc.getQueryData<ReadingMap>(qk.readings) ?? {});
  return readings.length ? { ...o, sensors: { ...o.sensors, latestReadings: readings } } : o;
}

/** Simpan snapshot tiap overview baru, lalu tiap menit & saat ditutup selama WebSocket tersambung.
 *  Dimuat sebelum anak dirender agar Beranda langsung berisi angka meski offline. */
export function useOfflineSnapshot(username: string, connection: ConnectionState) {
  const qc = useQueryClient();
  useState(() => hydrateFromSnapshot(qc, username));
  const connectionRef = useRef(connection);
  useEffect(() => {
    connectionRef.current = connection;
  }, [connection]);

  useEffect(() => {
    const save = (savedAt: number) => {
      const o = snapshotOf(qc);
      if (o) saveSnapshot(username, o, savedAt);
    };
    const unsubscribe = qc.getQueryCache().subscribe((e) => {
      // Hanya hasil fetch sungguhan (bukan setQueryData dari event atau dari snapshot itu sendiri).
      if (e.type === "updated" && e.action.type === "success" && !e.action.manual && e.query.queryKey[0] === qk.overview[0]) {
        save(e.query.state.dataUpdatedAt);
      }
    });
    const saveIfLive = () => {
      if (connectionRef.current === "connected" && onlineManager.isOnline()) save(Date.now());
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") saveIfLive();
    };
    const timer = setInterval(saveIfLive, LIVE_SAVE_INTERVAL_MS);
    window.addEventListener("pagehide", saveIfLive);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      unsubscribe();
      clearInterval(timer);
      window.removeEventListener("pagehide", saveIfLive);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [qc, username]);
}

/** Status jaringan versi TanStack Query (query ditunda, bukan gagal, saat offline). */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  );
}
