import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { Providers } from "./providers";
import { THEME_COLORS, themeInitScript } from "@/lib/theme-key";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const productName = "FertiMata";
const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? productName;

export const metadata: Metadata = {
  title: { default: siteName, template: `%s · ${siteName}` },
  description: "FertiMata: pemantauan dan kendali pemupukan otomatis greenhouse melon.",
  applicationName: productName,
  appleWebApp: { capable: true, title: productName, statusBarStyle: "default" },
  icons: { icon: [{ url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  // Diperbarui saat runtime sesuai tema aktif (lib/theme.tsx).
  themeColor: THEME_COLORS.light,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full font-sans">
        <Providers>{children}</Providers>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
