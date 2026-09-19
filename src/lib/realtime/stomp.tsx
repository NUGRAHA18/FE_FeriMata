"use client";

import { Client } from "@stomp/stompjs";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { siteConfig } from "@/config/site";
import { qk } from "@/lib/api/query-keys";
import { applyRealtimeEvent } from "./apply";

export type ConnectionState = "connected" | "connecting" | "disconnected";

// ── Store status koneksi (dibaca header & kartu) ─────────────────────────────
let state: ConnectionState = "connecting";
const listeners = new Set<() => void>();

function setState(next: ConnectionState) {
  if (next === state) return;
  state = next;
  listeners.forEach((l) => l());
}

export function useConnectionState(): ConnectionState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => "connecting" as const,
  );
}

/**
 * Koneksi STOMP (WebSocket native, bukan SockJS) selama ada token. Token dikirim di frame
 * CONNECT. Setiap kali (re)connect, overview di-refetch untuk menutup celah event yang terlewat.
 */
export function useRealtime(token: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!token) {
      setState("disconnected");
      return;
    }
    setState("connecting");
    // Satu kegagalan dianggap masih "menyambung"; setelah itu tampilkan "terputus".
    let failures = 0;
    const client = new Client({
      brokerURL: siteConfig.wsUrl,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5_000,
      heartbeatIncoming: 20_000,
      heartbeatOutgoing: 20_000,
      debug: () => {},
      onConnect: () => {
        failures = 0;
        setState("connected");
        client.subscribe("/topic/events", (msg) => {
          try {
            applyRealtimeEvent(qc, JSON.parse(msg.body));
          } catch {
            // Pesan rusak diabaikan.
          }
        });
        // Tutup celah event yang terlewat. Lewati bila overview baru saja diambil (koneksi pertama).
        const fetchedAt = qc.getQueryState(qk.overview)?.dataUpdatedAt ?? 0;
        if (Date.now() - fetchedAt > 3_000) void qc.invalidateQueries({ queryKey: qk.overview }, { cancelRefetch: false });
      },
      onWebSocketClose: () => {
        failures++;
        setState(failures >= 2 ? "disconnected" : "connecting");
      },
      onStompError: () => setState("disconnected"),
    });
    client.activate();
    return () => {
      void client.deactivate();
      setState("disconnected");
    };
  }, [token, qc]);
}
