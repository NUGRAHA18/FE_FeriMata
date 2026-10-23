# FertiMata — Frontend


Aplikasi web (PWA) untuk petani/operator: memantau sensor, mengendalikan pompa dan kamera, dan menerima peringatan dari greenhouse melon dengan pemupukan otomatis. Bahasa antarmuka sederhana, tanpa istilah teknis.
Status pekerjaan: [`docs/status-pekerjaan.md`](docs/status-pekerjaan.md). Celah backend: [`docs/backend-gaps.md`](docs/backend-gaps.md).
Spesifikasi awal (arsip): [`docs/arsip/prompt-frontend-awal.md`](docs/arsip/prompt-frontend-awal.md).

Stack: Next.js 16 (App Router) · TypeScript strict · Tailwind CSS 4 · TanStack Query · @stomp/stompjs ·
Recharts · lucide-react · zod · Vitest.

## Menjalankan

```bash
cp .env.example .env.local      # sesuaikan URL backend & nama/lokasi situs
npm install
npm run dev                     # http://localhost:3000 (port 3000 wajib: CORS backend)
```

Backend profil `dev` (repo `BE-melonSmart`): login `operator` / `dev-operator-password`.

| Skrip | Fungsi |
|---|---|
| `npm run dev` | server pengembangan |
| `npm run build` / `npm start` | build produksi (`output: 'standalone'`, untuk Jetson) |
| `npm test` | unit & component test (Vitest + jsdom) |
| `npm run typecheck` · `npm run lint` | pemeriksaan statis |

## Tema

Tiga mode tampilan — **Terang**, **Gelap**, **Hijau** (hijau mendominasi latar, kartu, dan elemen
aktif) — plus "Ikuti sistem". Ganti lewat tombol tema di rail/top bar (siklus Terang → Gelap → Hijau)
atau di **Pengaturan**. Token warna ada di `src/app/globals.css` (`:root`, `[data-theme="dark"]`,
`[data-theme="green"]`); tema dipasang sebelum paint pertama oleh skrip di `src/lib/theme-key.ts`.

## Struktur

```
src/app/login                 halaman login
src/app/(console)/…           halaman konsol (dashboard, sensors, actuators, devices, alerts, ai, settings, profile)
src/app/(console)/console-frame.tsx   gerbang auth + realtime + banner global + drawer alert
src/components/ui             primitif (Card, MetricCard, Button, Dialog/Drawer, Tabs, Segmented, …)
src/components/*              kartu domain (dashboard, actuators, sensors, devices, alerts, ai, shell)
src/config/dashboard-layout.ts        SATU-SATUNYA pemetaan metric key → kartu dashboard
src/lib/api                   klien HTTP (ApiRequestError), tipe + skema zod, endpoint, hook query, kunci cache
src/lib/realtime              klien STOMP + penerapan event ke cache (apply.ts)
src/lib/actuator-safety.ts    validasi durasi & terjemahan penolakan keamanan
src/lib/icons.ts             ikon per tipe alat/sensor/aktuator
src/lib/format.ts             angka, satuan, waktu WIB, label Indonesia
src/lib/offline               snapshot angka terakhir untuk mode offline
src/components/onboarding     petunjuk Beranda
src/test                      bantuan test halaman (provider, sesi, fixture)
```

## Prinsip yang dijaga

- **REST untuk data awal, WebSocket untuk perubahan — tanpa polling.** Event STOMP (`/topic/events`)
  ditulis langsung ke cache via `setQueryData`; pembacaan sensor dinormalisasi per `sensorId` sehingga
  hanya kartu yang nilainya berubah yang re-render. Setiap reconnect me-refetch overview.
- **Kontrol aktuator aman:** status = yang dilaporkan perangkat (tanpa optimistic update), dialog
  konfirmasi, 202 ≠ berhasil (ikuti `commandUid` sampai EXECUTED/FAILED, peringatan setelah 30 dtk),
  STOP selalu aktif, interlock dijelaskan dalam Bahasa Indonesia, tombol kirim dikunci selama request.
- **Jujur terhadap data:** tidak ada ambang agronomi, skor kesehatan, atau endpoint karangan. Data yang
  tidak ada tampil "—".
- **Mode offline hanya-baca:** angka terakhir (overview + pembacaan) disimpan per pengguna di
  localStorage (`src/lib/offline`) dan dimuat saat jaringan putus, dengan banner yang menyebut kapan
  data itu diambil. Dihapus saat keluar. Service worker meng-cache aset statis dan HTML halaman
  (jaringan dulu) supaya aplikasi tetap terbuka; respons API tidak pernah di-cache.
- **Petunjuk & mode sederhana:** petunjuk Beranda terbuka sekali untuk pengguna baru (bisa dibuka
  lagi di Pengaturan); mode sederhana menyembunyikan semua panel "Info teknis" (`TechInfo`).
