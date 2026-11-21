# Panduan bergambar

Gambar di halaman **Panduan** (tangkapan layar HP dengan nomor) dibuat otomatis dari aplikasi yang berjalan,
dengan data contoh menggantikan API. Kalau tampilan aplikasi berubah, buat ulang gambarnya dengan satu perintah.

```bash
# terminal 1: build produksi (tanpa tombol dev Next di gambar) lalu jalankan
NEXT_PUBLIC_API_BASE_URL="" NEXT_PUBLIC_SITE_LOCATION="Greenhouse Melon" npm run build
npm start                              # http://localhost:3000

# terminal 2
npx playwright install chromium        # sekali saja
npm run panduan:shots                  # --base http://localhost:3000 bawaan, --only beranda untuk satu halaman
```

Hasil (di-commit): `public/panduan/<halaman>-<n>.jpg` dan `src/lib/guide-visual/<halaman>.generated.json`
(posisi nomor dalam persen).

| Berkas | Isi |
| --- | --- |
| `pages.mjs` | Halaman yang difoto, cara memotong layar, dan **bagian bernomor** (dicari lewat teks/judul, bukan kelas CSS). |
| `demo-data.mjs` | Data contoh: semua sensor terisi, perangkat terhubung. Bentuk data = respons API asli (`src/lib/api/types.ts`). |
| `fixtures/catalog.json` | Nama perangkat dan aktuator (katalog), tanpa data kebun atau akun. |
| `shots.mjs` | Membuka halaman di Chromium berukuran HP, mengganti `/api` dan WebSocket, memotret, mencatat posisi nomor. |

Teks penjelasan tiap nomor ada di `src/lib/guide-visual.ts`; `id` harus sama dengan `pages.mjs`
(dijaga oleh `src/lib/guide-visual.test.ts`).

## Menambah halaman

1. Tambahkan entri di `pages.mjs` (path, `parts`, `spots`). Kalau bagian tidak ketemu, skrip berhenti dengan nama bagiannya.
2. Tambahkan data API yang dibutuhkan halaman itu di `demo-data.mjs` dan daftar `routes` di `shots.mjs`.
3. Jalankan `npm run panduan:shots -- --only <halaman>`, lalu tulis teksnya di `guide-visual.ts`.
