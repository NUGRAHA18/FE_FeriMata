"use client";

import { useSyncExternalStore } from "react";
import { getSession, subscribeSession, type Session } from "./session";

/** `undefined` selama render server/hidrasi; `null` bila tidak ada sesi berlaku. */
export function useSession(): Session | null | undefined {
  return useSyncExternalStore(subscribeSession, getSession, () => undefined);
}

/** Peran yang boleh mengubah data (menyalakan perangkat, mencatat, menandai peringatan) dan mengelola pengguna.
 *  OPERATOR adalah peran tertinggi; "ADMIN" hanya ada di sesi lama yang tersimpan sebelum peran itu dihapus
 *  (dianggap OPERATOR sampai pengguna masuk lagi). */
export const WRITE_ROLES: readonly string[] = ["OPERATOR", "ADMIN"];

/** VIEWER hanya memantau: tombol aksi disembunyikan, bukan ditampilkan lalu ditolak server. */
export function useCanWrite(): boolean {
  const session = useSession();
  return !!session && WRITE_ROLES.includes(session.user.role);
}
