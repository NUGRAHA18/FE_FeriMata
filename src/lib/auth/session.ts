import type { User } from "@/lib/api/types";

/*
 * Sesi operator. Backend memberi token 60 menit tanpa refresh token, jadi sesi disimpan
 * sebagai { token, expiresAt, user } dan dihapus saat kedaluwarsa atau saat menerima 401.
 */

export type Session = { token: string; expiresAt: string; user: User };
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
    const s = JSON.parse(raw) as Session;
    if (typeof s?.token !== "string" || typeof s?.expiresAt !== "string") return null;
    if (Date.parse(s.expiresAt) <= Date.now()) return null;
    return s;
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
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Penyimpanan tidak tersedia: sesi hanya hidup di memori tab ini.
    cachedRaw = JSON.stringify(session);
    cachedSession = session;
  }
  lastEndReason = null;
  emit();
}

export function endSession(reason: EndReason) {
  if (!getSession() && lastEndReason) return;
  lastEndReason = reason;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // abaikan
  }
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
