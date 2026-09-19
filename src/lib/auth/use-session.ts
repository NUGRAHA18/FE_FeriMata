"use client";

import { useSyncExternalStore } from "react";
import { getSession, subscribeSession, type Session } from "./session";

/**
 * Sesi saat ini. `undefined` selama render server/hidrasi (belum diketahui),
 * `null` bila tidak ada sesi yang masih berlaku.
 */
export function useSession(): Session | null | undefined {
  return useSyncExternalStore(subscribeSession, getSession, () => undefined);
}
