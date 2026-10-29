/*
 * Service worker FertiMata.
 * - Aset statis ber-hash (/_next/static) dan ikon: cache dulu.
 * - Halaman (navigasi): jaringan dulu; bila offline, salinan halaman terakhir dari cache supaya
 *   aplikasi tetap terbuka dan menampilkan angka terakhir yang tersimpan di HP (lib/offline).
 *   HTML konsol tidak berisi data — data dimuat di klien setelah sesi diketahui.
 * - Respons API (/api) dan WebSocket TIDAK PERNAH di-cache: data kendali harus selalu segar.
 * - Notifikasi push peringatan darurat (Web Push dari backend) dan klik notifikasinya.
 * - `/sw.js?cache=off` (dipakai `next dev`): hanya push, tanpa cache, supaya HMR tidak terganggu.
 */
const STATIC_CACHE = "fertimata-static-v1";
const PAGE_CACHE = "fertimata-pages-v1";
const CACHE_ON = new URL(self.location.href).searchParams.get("cache") !== "off";
const KEEP = CACHE_ON ? [STATIC_CACHE, PAGE_CACHE] : [];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function pageNetworkFirst(req) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok && res.type === "basic") cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    // Halaman ini belum pernah dibuka: arahkan ke Beranda yang tersimpan.
    if (new URL(req.url).pathname !== "/" && (await cache.match("/"))) return Response.redirect("/", 302);
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (!CACHE_ON || req.method !== "GET") return;
  const url = new URL(req.url);
  // Lintas origin (backend API/WebSocket di host lain) dan API same-origin: selalu ke jaringan.
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws")) return;

  if (req.mode === "navigate") {
    event.respondWith(pageNetworkFirst(req));
    return;
  }

  if (!url.pathname.startsWith("/_next/static/") && !url.pathname.startsWith("/icons/")) return;
  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }),
  );
});

// ── Notifikasi push ──────────────────────────────────────────────────────────
// Payload backend: {title, body, tag, url, alertId, severity, type, createdAt}; uji: tag "fertimata-test".

self.addEventListener("push", (event) => {
  let p = {};
  try {
    p = event.data ? event.data.json() : {};
  } catch {
    p = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(p.title || "FertiMata", {
      body: p.body || "",
      tag: p.tag || undefined,
      icon: "/icons/icon-192.png",
      // Ikon kecil di status bar Android: siluet putih di latar transparan.
      badge: "/icons/badge-96.png",
      data: { url: p.url || "/alerts" },
      // Tag yang sama mengganti notifikasi lama; renotify tetap membunyikan/menggetarkan HP.
      renotify: !!p.tag,
      requireInteraction: p.severity === "CRITICAL",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/alerts", self.location.origin);
  event.waitUntil(
    (async () => {
      const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const same = tabs.find((c) => new URL(c.url).pathname === target.pathname);
      if (same) return same.focus();
      // Aplikasi sudah terbuka di halaman lain: pindahkan ke halaman tujuan.
      const any = tabs.find((c) => new URL(c.url).origin === target.origin);
      if (any) {
        const moved = await any.navigate(target.href).catch(() => null);
        return (moved || any).focus();
      }
      return self.clients.openWindow(target.href);
    })(),
  );
});
