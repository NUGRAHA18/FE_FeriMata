"use client";

import { useEffect } from "react";
import { startInstallCapture } from "@/lib/pwa-install";

// Di dev cache SW dimatikan (`?cache=off`, mengganggu HMR) tapi tetap didaftarkan agar push bisa
// dicoba di http://localhost.
export function RegisterServiceWorker() {
  // Peristiwa pasang aplikasi hanya dikirim sekali oleh browser, jadi harus ditangkap sejak halaman dibuka
  // (di layout), bukan baru di Beranda. Kartu pasang di Beranda membaca hasilnya.
  useEffect(() => startInstallCapture(), []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const url = process.env.NODE_ENV === "production" ? "/sw.js" : "/sw.js?cache=off";
    navigator.serviceWorker.register(url, { scope: "/", updateViaCache: "none" }).catch(() => {
      // PWA opsional: aplikasi tetap berjalan tanpa service worker.
    });
  }, []);
  return null;
}
