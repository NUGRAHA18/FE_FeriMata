import { dashboardOverviewSchema, type DashboardOverview } from "@/lib/api/types";

/*
 * Salinan terakhir overview dashboard di localStorage, supaya angka terakhir tetap bisa dilihat saat
 * jaringan greenhouse putus. Hanya untuk DIBACA: perintah ke alat tetap selalu lewat jaringan.
 * Disimpan per pengguna dan dihapus saat keluar, karena HP bisa dipakai bergantian.
 */

const KEY = "fertimata.last-overview";
const VERSION = 1;

export type OverviewSnapshot = { savedAt: number; overview: DashboardOverview };

export function saveSnapshot(username: string, overview: DashboardOverview, savedAt: number) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, user: username, savedAt, overview }));
  } catch {
    // Penyimpanan penuh/tidak tersedia: mode offline tidak tersedia, aplikasi tetap jalan.
  }
}

/** Snapshot milik `username`, atau null bila tidak ada, milik orang lain, rusak, atau formatnya lama. */
export function loadSnapshot(username: string): OverviewSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as { v?: unknown; user?: unknown; savedAt?: unknown; overview?: unknown };
    if (s.v !== VERSION || s.user !== username || typeof s.savedAt !== "number") return null;
    const parsed = dashboardOverviewSchema.safeParse(s.overview);
    return parsed.success ? { savedAt: s.savedAt, overview: parsed.data } : null;
  } catch {
    return null;
  }
}

export function clearSnapshot() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // abaikan
  }
}
