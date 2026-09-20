# Smart Melon — Frontend (FERTIMATA Rev A)


Konsol operator PWA untuk memantau dan mengendalikan greenhouse melon dengan fertigasi otomatis.
Spesifikasi lengkap: [`prompt-frontend.md`](prompt-frontend.md). Celah backend: [`docs/backend-gaps.md`](docs/backend-gaps.md).

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
src/lib/actuator-safety.ts    validasi durasi & terjemahan interlock
src/lib/format.ts             angka, satuan, waktu WIB, label Indonesia
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
- Service worker hanya meng-cache aset statis; respons API tidak pernah di-cache.
