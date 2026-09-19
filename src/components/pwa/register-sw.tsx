"use client";

import { useEffect } from "react";

/** Daftarkan service worker di produksi saja (di dev, cache aset akan mengganggu HMR). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // PWA opsional: aplikasi tetap berjalan tanpa service worker.
    });
  }, []);
  return null;
}
