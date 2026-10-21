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
    background_color: "#eef5ef",
    theme_color: "#1f9a53",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
