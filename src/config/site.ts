// URL backend. Kosong = origin yang sama dengan halaman: di Jetson, reverse proxy (Caddy) meneruskan
// /api dan /ws ke backend, jadi halaman yang dibuka lewat tunnel maupun IP LAN memanggil host-nya sendiri.
// Default dev tetap backend lokal di :8080 supaya `npm run dev` jalan tanpa .env.local.
const devDefault = process.env.NODE_ENV === "production" ? "" : "http://localhost:8080";

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Greenhouse Melon",
  location: process.env.NEXT_PUBLIC_SITE_LOCATION ?? "",
  apiBaseUrl: (process.env.NEXT_PUBLIC_API_BASE_URL ?? devDefault).replace(/\/+$/, ""),
  wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? (devDefault ? "ws://localhost:8080/ws" : ""),
  timeZone: "Asia/Jakarta",
} as const;

/** Origin absolut backend: `apiBaseUrl`, atau origin halaman bila kosong. Hanya dipanggil di browser. */
export function apiOrigin(): string {
  return siteConfig.apiBaseUrl || window.location.origin;
}

/** URL WebSocket STOMP: `wsUrl`, atau ws(s)://<host halaman>/ws bila kosong. Hanya dipanggil di browser. */
export function realtimeUrl(): string {
  if (siteConfig.wsUrl) return siteConfig.wsUrl;
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${window.location.host}/ws`;
}
