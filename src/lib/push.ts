import { getPushConfig, subscribePush, unsubscribePush } from "@/lib/api/endpoints";

/* Web Push (VAPID) untuk peringatan darurat; backend menyimpan endpoint langganan per akun.
 * Izin notifikasi HANYA diminta dari klik pengguna. */

/** Kenapa push tidak bisa dipakai di perangkat ini, atau "ok". Urutan pemeriksaan = urutan saran ke pengguna. */
export type PushSupport = "insecure" | "ios-install" | "unsupported" | "ok";

type Env = {
  isSecureContext: boolean;
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  standalone: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
};

function readEnv(): Env {
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    isSecureContext: window.isSecureContext,
    userAgent: nav.userAgent,
    platform: nav.platform,
    maxTouchPoints: nav.maxTouchPoints,
    standalone: nav.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches === true,
    hasServiceWorker: "serviceWorker" in nav,
    hasPushManager: "PushManager" in window,
    hasNotification: "Notification" in window,
  };
}

/** iPhone/iPad (iPadOS melapor sebagai Mac dengan layar sentuh). */
export function isIos(env: Pick<Env, "userAgent" | "platform" | "maxTouchPoints">): boolean {
  return /iPad|iPhone|iPod/.test(env.userAgent) || (env.platform === "MacIntel" && (env.maxTouchPoints ?? 0) > 1);
}

export function pushSupport(env: Env = readEnv()): PushSupport {
  // http://IP (Jetson tanpa domain) bukan konteks aman; http://localhost tetap aman.
  if (!env.isSecureContext) return "insecure";
  // Di iOS 16.4+ push hanya ada untuk PWA yang dipasang ke Layar Utama.
  if (isIos(env) && !env.standalone) return "ios-install";
  if (!env.hasServiceWorker || !env.hasPushManager || !env.hasNotification) return "unsupported";
  return "ok";
}

/** Kunci publik VAPID (base64url) → byte untuk applicationServerKey. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Langganan dibuat dengan kunci server ini? (false bila kunci tidak diketahui → anggap beda). */
export function sameServerKey(subscriptionKey: ArrayBuffer | null | undefined, publicKey: string): boolean {
  if (!subscriptionKey) return false;
  const a = new Uint8Array(subscriptionKey);
  const b = urlBase64ToUint8Array(publicKey);
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

async function registration(): Promise<ServiceWorkerRegistration> {
  // Didaftarkan RegisterServiceWorker; `ready` menunggu sampai aktif.
  return navigator.serviceWorker.ready;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== "ok") return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

/** Hapus langganan di server (bila masih ada sesi) lalu di browser. Kesalahan server tidak menghentikan. */
async function drop(sub: PushSubscription) {
  try {
    await unsubscribePush(sub.endpoint);
  } catch {
    // Server mungkin tidak terjangkau; langganan di browser tetap dicabut.
  }
  await sub.unsubscribe().catch(() => false);
}

export type EnableResult = "on" | "blocked" | "dismissed";

/** Dipanggil dari klik pengguna: minta izin, berlangganan dengan kunci server, lalu daftarkan ke backend. */
export async function enablePush(publicKey: string): Promise<EnableResult> {
  const permission = await Notification.requestPermission();
  if (permission === "denied") return "blocked";
  if (permission !== "granted") return "dismissed";
  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameServerKey(sub.options.applicationServerKey, publicKey)) {
    await drop(sub);
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
  await subscribePush(sub.toJSON());
  return "on";
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (sub) await drop(sub);
}

/** Saat keluar: cabut langganan di server SEBELUM token dibuang, lalu di browser, agar HP bergantian tidak
 * menerima peringatan akun lama. Dibatasi 3 detik agar tombol Keluar tidak macet. */
export async function disablePushOnLogout(): Promise<void> {
  await Promise.race([disablePush().catch(() => undefined), new Promise((r) => setTimeout(r, 3000))]);
}

/** Kunci VAPID server berganti: bila izin sudah ada, perbarui langganan diam-diam (tanpa dialog izin).
 * Tidak melakukan apa pun bila belum berlangganan. */
export async function syncPushKey(): Promise<void> {
  if (pushSupport() !== "ok" || Notification.permission !== "granted") return;
  const sub = await currentSubscription();
  if (!sub) return;
  const config = await getPushConfig();
  if (!config.enabled || !config.publicKey) return;
  if (sameServerKey(sub.options.applicationServerKey, config.publicKey)) return;
  await enablePush(config.publicKey);
}
