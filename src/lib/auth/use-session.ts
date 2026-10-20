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

/** Peran yang boleh mengubah data (menyalakan alat, mencatat, menandai peringatan). */
export const WRITE_ROLES: readonly string[] = ["ADMIN", "OPERATOR"];

/**
 * Apakah pengguna saat ini boleh melakukan aksi. Pelihat (VIEWER) hanya memantau: tombol aksi
 * disembunyikan sama sekali, bukan ditampilkan lalu ditolak server.
 */
export function useCanWrite(): boolean {
  const session = useSession();
  return !!session && WRITE_ROLES.includes(session.user.role);
}
