import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME;
  return {
    name: siteName && siteName !== "FertiMata" ? `FertiMata — ${siteName}` : "FertiMata",
    short_name: "FertiMata",
    description: "FertiMata: pemantauan dan kendali pemupukan otomatis greenhouse melon.",
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
