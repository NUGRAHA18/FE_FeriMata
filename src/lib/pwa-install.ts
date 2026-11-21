import { isIos } from "@/lib/push";

/* Pasang aplikasi (PWA) ke layar utama.
 * Chrome/Edge/Android mengirim `beforeinstallprompt` SEKALI dan menunggu dipakai; kalau tidak ditangkap sejak
 * halaman dibuka, tombol pasang tidak bisa dibuat lagi (yang muncul hanya bar bawaan browser, mis. sesaat
 * setelah masuk). Karena itu peristiwanya ditangkap di sini (dipanggil RegisterServiceWorker di layout) dan
 * kartu di Beranda hanya membaca hasilnya. iOS tidak punya peristiwa ini: pengguna dipandu manual. */

type InstallChoice = { outcome: "accepted" | "dismissed"; platform?: string };

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

/** installed: sudah berjalan sebagai aplikasi · prompt: tombol langsung memasang · ios/manual: perlu petunjuk ·
 *  insecure: http://IP tidak bisa dipasang. */
export type InstallState = "installed" | "prompt" | "ios" | "manual" | "insecure";

export type InstallEnv = {
  isSecureContext: boolean;
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  standalone: boolean;
  /** Peristiwa pasang sudah ditangkap dan belum dipakai. */
  hasPrompt: boolean;
  /** Peristiwa `appinstalled` sudah terjadi di sesi ini. */
  justInstalled: boolean;
};

export function installState(env: InstallEnv): InstallState {
  if (env.standalone || env.justInstalled) return "installed";
  if (env.hasPrompt) return "prompt";
  // http://IP (Jetson tanpa domain) bukan konteks aman; http://localhost tetap aman.
  if (!env.isSecureContext) return "insecure";
  if (isIos(env)) return "ios";
  return "manual";
}

let deferred: BeforeInstallPromptEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => cb());
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

function readEnv(): InstallEnv {
  return {
    isSecureContext: window.isSecureContext,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone: isStandalone(),
    hasPrompt: deferred !== null,
    justInstalled,
  };
}

/** Mulai menangkap peristiwa pasang. Aman dipanggil berulang (mis. StrictMode); mengembalikan pembersih. */
export function startInstallCapture(): () => void {
  const onPrompt = (e: Event) => {
    // Tahan bar bawaan browser; tombol di Beranda yang memicunya.
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  };
  const onInstalled = () => {
    deferred = null;
    justInstalled = true;
    notify();
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

export function subscribeInstall(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Snapshot primitif (string) supaya useSyncExternalStore stabil. */
export function getInstallSnapshot(): InstallState {
  return installState(readEnv());
}

/** Tampilkan dialog pasang bawaan browser. `unavailable` bila peristiwanya tidak (lagi) ada. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = deferred;
  if (!event) return "unavailable";
  // Peristiwa ini hanya boleh dipakai sekali.
  deferred = null;
  notify();
  try {
    await event.prompt();
    const choice = await event.userChoice;
    return choice.outcome;
  } catch {
    return "unavailable";
  }
}

/** Hanya untuk test: kembalikan keadaan modul. */
export function resetInstallStateForTests() {
  deferred = null;
  justInstalled = false;
  listeners.clear();
}
