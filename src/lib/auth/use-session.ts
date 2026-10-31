"use client";

import { useSyncExternalStore } from "react";
import { getSession, subscribeSession, type Session } from "./session";

/** `undefined` selama render server/hidrasi; `null` bila tidak ada sesi berlaku. */
export function useSession(): Session | null | undefined {
  return useSyncExternalStore(subscribeSession, getSession, () => undefined);
}

/** Peran yang boleh mengubah data (menyalakan alat, mencatat, menandai peringatan). */
export const WRITE_ROLES: readonly string[] = ["ADMIN", "OPERATOR"];

/** VIEWER hanya memantau: tombol aksi disembunyikan, bukan ditampilkan lalu ditolak server. */
export function useCanWrite(): boolean {
  const session = useSession();
  return !!session && WRITE_ROLES.includes(session.user.role);
}
