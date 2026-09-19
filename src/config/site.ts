export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Greenhouse Melon",
  location: process.env.NEXT_PUBLIC_SITE_LOCATION ?? "",
  apiBaseUrl: (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(/\/+$/, ""),
  wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080/ws",
  timeZone: "Asia/Jakarta",
} as const;
