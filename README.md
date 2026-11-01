# FertiMata — Frontend

PWA untuk petani/operator greenhouse melon: memantau sensor, mengendalikan pompa & kamera, jadwal siram, dan peringatan.
Next.js 16 · TypeScript · Tailwind 4 · TanStack Query · STOMP · zod · Vitest.

## Menjalankan

```bash
cp .env.example .env.local   # URL backend, nama & lokasi situs
npm install
npm run dev                  # http://localhost:3000 (port wajib 3000: CORS backend)
```

Login backend profil `dev`: `operator` / `dev-operator-password`.

| Skrip | Fungsi |
|---|---|
| `npm run build` / `npm start` | build produksi (`standalone`, untuk Jetson) |
| `npm test` · `npm run typecheck` · `npm run lint` | test & pemeriksaan statis |

## Struktur

```
src/app/(console)/   halaman konsol        src/lib/api/       klien HTTP, skema zod, endpoint, hook query
src/components/      kartu & UI primitif   src/lib/realtime/  STOMP → cache
src/config/          pemetaan metric key   src/app/globals.css  token tema terang & gelap
```

## Prinsip

- REST untuk data awal, WebSocket untuk perubahan; tanpa polling.
- Status aktuator = laporan alat (tanpa optimistic update), setiap perintah dikonfirmasi.
- Tidak mengarang data: yang tidak ada tampil "—".
