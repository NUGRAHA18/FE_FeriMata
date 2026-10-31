"use client";

import { useEffect } from "react";

// Di dev cache SW dimatikan (`?cache=off`, mengganggu HMR) tapi tetap didaftarkan agar push bisa
// dicoba di http://localhost.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const url = process.env.NODE_ENV === "production" ? "/sw.js" : "/sw.js?cache=off";
    navigator.serviceWorker.register(url, { scope: "/", updateViaCache: "none" }).catch(() => {
      // PWA opsional: aplikasi tetap berjalan tanpa service worker.
    });
  }, []);
  return null;
}
