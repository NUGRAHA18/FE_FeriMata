import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `Smart Melon — ${process.env.NEXT_PUBLIC_SITE_NAME ?? "Greenhouse Melon"}`,
    short_name: "Smart Melon",
    description: "Konsol operator Smart Melon (FERTIMATA): pemantauan dan kendali fertigasi greenhouse melon.",
    lang: "id",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#e9e9e9",
    theme_color: "#2f9e55",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
