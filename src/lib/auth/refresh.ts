import { apiOrigin } from "@/config/site";
import { loginResponseSchema } from "@/lib/api/types";
import { endSession, getSession, saveSession } from "./session";

/** Perbarui bila token akses habis dalam waktu ini. */
export const REFRESH_LEEWAY_MS = 2 * 60_000;

/** Pure: apakah token akses perlu diperbarui sekarang. */
export function needsRefresh(expiresAt: string, now: number = Date.now(), leewayMs = REFRESH_LEEWAY_MS): boolean {
  const t = Date.parse(expiresAt);
  return Number.isNaN(t) || t - now <= leewayMs;
}

let inFlight: Promise<boolean> | null = null;

/** True bila sesi diperpanjang. Refresh token ditolak (401) → sesi diakhiri dengan alasan "expired". */
export function refreshSession(): Promise<boolean> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const session = getSession();
    if (!session?.refreshToken) return false;
    try {
      const res = await fetch(`${apiOrigin()}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        endSession("expired");
        return false;
      }
      if (!res.ok) return false; // gangguan sementara: token lama tetap dipakai, coba lagi nanti
      const parsed = loginResponseSchema.safeParse(await res.json());
      if (!parsed.success) return false;
      const d = parsed.data;
      saveSession({ token: d.accessToken, expiresAt: d.expiresAt, refreshToken: d.refreshToken, refreshExpiresAt: d.refreshExpiresAt, user: d.user });
      return true;
    } catch {
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Dipanggil sebelum setiap request ber-token: perbarui dulu bila sudah hampir habis. */
export async function ensureFreshToken(): Promise<void> {
  const session = getSession();
  if (!session) return;
  if (needsRefresh(session.expiresAt) && session.refreshToken) await refreshSession();
}
