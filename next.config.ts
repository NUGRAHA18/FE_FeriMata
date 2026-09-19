import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dijalankan di Jetson Orin Nano bersama backend & PostgreSQL: bundle mandiri yang ramping.
  output: "standalone",
  poweredByHeader: false,
  images: { unoptimized: true },
  // Kiri bawah dipakai tombol Profil di rail navigasi.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
