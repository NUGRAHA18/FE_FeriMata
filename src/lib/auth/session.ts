import type { User } from "@/lib/api/types";
import { clearSnapshot } from "@/lib/offline/snapshot";

/* Token akses 60 menit, refresh token 7 hari. Sesi hidup selama refresh token belum kedaluwarsa;
 * token akses diperbarui diam-diam oleh lib/auth/refresh.ts. */

export type Session = { token: string; expiresAt: string; refreshToken: string; refreshExpiresAt: string; user: User };
export type EndReason = "logout" | "expired" | "unauthorized";

const KEY = "fertimata.session";
const listeners = new Set<() => void>();

let cachedRaw: string | null | undefined;
let cachedSession: Session | null = null;
let lastEndReason: EndReason | null = null;

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<Session>;
    if (typeof s?.token !== "string" || typeof s?.expiresAt !== "string" || !s.user) return null;
    // Sesi lama (tanpa refresh token) hanya hidup sampai token aksesnya habis.
    const end = typeof s.refreshExpiresAt === "string" ? s.refreshExpiresAt : s.expiresAt;
    if (Date.parse(end) <= Date.now()) return null;
    return {
      token: s.token,
      expiresAt: s.expiresAt,
      refreshToken: typeof s.refreshToken === "string" ? s.refreshToken : "",
      refreshExpiresAt: end,
      user: s.user,
    };
  } catch {
    return null;
  }
}

/** Snapshot stabil (referensi sama selama isi storage tidak berubah) untuk useSyncExternalStore. */
export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = read();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSession = parse(raw);
  }
  return cachedSession;
}

export function getToken(): string | null {
  return getSession()?.token ?? null;
}

function emit() {
  listeners.forEach((l) => l());
}

export function saveSession(session: Session) {
  const raw = JSON.stringify(session);
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    // Penyimpanan tidak tersedia: sesi hanya hidup di memori tab ini.
  }
  cachedRaw = raw;
  cachedSession = session;
  lastEndReason = null;
  emit();
}

/** Mengganti sebagian field sesi (mis. token baru setelah refresh) tanpa menyentuh yang lain. */
export function updateSession(patch: Partial<Session>) {
  const current = getSession();
  if (!current) return;
  saveSession({ ...current, ...patch });
}

export function endSession(reason: EndReason) {
  if (!getSession() && lastEndReason) return;
  lastEndReason = reason;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // abaikan
  }
  // Keluar sengaja (HP bisa dipakai bergantian): angka tersimpan untuk mode offline ikut dihapus.
  if (reason === "logout") clearSnapshot();
  cachedRaw = undefined;
  cachedSession = null;
  emit();
}

/** Alasan sesi terakhir berakhir (untuk pesan di halaman login). */
export function consumeEndReason(): EndReason | null {
  const r = lastEndReason;
  lastEndReason = null;
  return r;
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Hanya izinkan path internal untuk parameter ?next= (cegah open redirect). */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || next.startsWith("/login")) return "/";
  return next;
}
