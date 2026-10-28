# Status Pekerjaan Frontend FertiMata — 28 Oktober 2026

Pelacak pekerjaan frontend. Disusun dari `BE-melonSmart/docs/status-pekerjaan.md` (bagian 3),
`BE-melonSmart/docs/rencana-pengembangan.md` (Fase 3–6), dan `docs/backend-gaps.md`.

Legenda prioritas: **P1** menghambat pemakaian di lapangan · **P2** perlu sebelum musim tanam penuh ·
**P3** perbaikan kualitas.

---

## 1. Menunggu: testing dengan petani

| Prio | Pekerjaan | Status |
|---|---|---|
| P1 | **Uji dengan pengguna petani** di ponsel sungguhan: ukuran huruf, kontras di bawah sinar matahari, mode Hijau, pemahaman bahasa, dan petunjuk Beranda. | ⏳ Menunggu jadwal uji di lapangan. Bukan pekerjaan teknis; hasilnya dicatat di sini sebagai butir baru. |

Yang perlu diamati saat uji: apakah petunjuk Beranda dibaca sampai habis, apakah banner offline dipahami
("data terakhir pukul …"), dan apakah mode sederhana sebaiknya aktif secara bawaan.

---

## 2a. Selesai — 28 Oktober 2026 (integrasi BE-1, BE-2, BE-7)

| Prio | Pekerjaan | Hasil |
|---|---|---|
| P2 | **Aktuator virtual (BE-1)** | Tombol per tipe dari `src/lib/actuator-commands.ts`, disaring `supportedCommands`: Patroli kamera (`TROLLEY-PATROL` START/STOP), Kereta kamera pindah stasiun (`TROLLEY-GOTO` GOTO_STATION dengan tombol stasiun 1–10, HOME, STOP). Campur pupuk otomatis (`DOSING-LOOP`) dicabut 28 Okt 2026: jadwal siram/dosing dan campur otomatis milik layanan terpisah tim AI; aktuator lama disembunyikan dari daftar. Status "Sedang berjalan / Tidak berjalan". Tombol Hentikan tidak pernah dinonaktifkan. Tipe virtual baru yang belum dikenal mendapat tombol mentah per perintah. Penolakan 400 `INVALID_COMMAND` dari kosakata backend dijelaskan per isian. |
| P2 | **"Patroli sekarang"** di kartu kamera Beranda | Menggantikan rencana "Ambil foto sekarang" (`CAPTURE_RUN` tidak dibuat; patroli manual = `TROLLEY-PATROL START`). Saat patroli berjalan tombolnya menjadi "Hentikan". Pelihat hanya melihat status. |
| P2 | **Foto patroli (BE-2)** | `/captures/**` diambil dengan `fetchProtectedBlob` (token + perpanjang sesi sekali saat 401) lalu ditampilkan sebagai object URL yang di-cache per URL 10 menit; URL di luar `/captures` origin backend tetap `<img src>` biasa. Gagal → placeholder. |
| P2 | **Kode alasan gagal (BE-7)** | `failureCode` (atau awalan `KODE:` di `errorMessage` untuk backend lama) diterjemahkan ke bahasa petani di pelacak perintah, riwayat perintah, dan aktivitas Beranda; teks asli alat di tooltip. Pesan peringatan "gagal menjalankan" membuang awalan kode. Label tipe peringatan dari edge (patroli, disk, trolley, dosing, …) ditambahkan. |
| P3 | Test | `actuator-commands.test.ts`, test dialog (pindah stasiun, alasan gagal), `detection-parts.test.tsx`. 63 → 84 → 81 test (test campur pupuk dihapus). |

## 2. Selesai — 22 Oktober 2026

| Prio | Pekerjaan | Hasil |
|---|---|---|
| P2 | **Mode offline / cache ringan** | Angka terakhir (overview + pembacaan dari WebSocket) disimpan per pengguna di localStorage (`src/lib/offline`): setiap overview baru, tiap menit dan saat aplikasi ditutup selama data langsung tersambung. Saat offline, Beranda langsung berisi angka terakhir dan banner menyebut waktunya. Dihapus saat pengguna keluar. Service worker kini menyimpan HTML halaman (jaringan dulu, cache bila offline) agar aplikasi tetap terbuka; respons API tetap tidak pernah di-cache. |
| P2 | **Petunjuk singkat / onboarding** | Dialog bertahap (`src/components/onboarding/guide.tsx`) yang terbuka sekali di Beranda untuk pengguna baru di perangkat itu; menjelaskan tiap kartu dengan bahasa sehari-hari. Langkah "Menyalakan alat" disembunyikan untuk Pelihat. Bisa dibuka lagi dari Pengaturan → "Buka petunjuk". |
| P3 | **Mode sederhana** | Saklar di Pengaturan. Semua panel "Info teknis" memakai satu komponen `TechInfo` yang tidak dirender saat mode sederhana aktif. Bawaan: nonaktif. |
| P3 | **Test komponen halaman** | Halaman Peringatan (filter, tandai ditangani, Pelihat) dan Pengaturan (mode sederhana, petunjuk, menu admin), petunjuk Beranda, snapshot offline. Bantuan bersama di `src/test/utils.tsx`. 40 → 56 test. |
| P2 | **Ekspor CSV untuk laporan** (Fase 3.7, bagian yang tidak butuh backend baru) | Tombol "Unduh CSV" di tab Riwayat detail sensor (pembacaan mentah sesuai rentang 1 jam–7 hari, tanpa rata-rata, maks 25.000 baris terbaru) dan di halaman Tanaman (semua pengamatan semua tanaman siklus berjalan, termasuk yang nonaktif, plus kolom sensor tanah dari snapshot). Format: koma, titik desimal, waktu WIB `YYYY-MM-DD HH:mm:ss`, BOM UTF-8; teks yang diawali `= + - @` dinetralkan. Pelihat juga bisa mengunduh. `src/lib/csv.ts`, `src/lib/reports.ts`, `ExportButton`. 56 → 63 test. |
| P3 | **`prompt-frontend.md`** | Diarsipkan ke `docs/arsip/prompt-frontend-awal.md` dengan catatan apa saja yang sudah berubah. |
| P3 | **`docs/backend-gaps.md`** | Siklus tanam/HST dipindah ke "sudah ditutup"; push notification ditambahkan ke "belum ada". |

---

## 3. Menunggu backend / tim lain

| Prio / Fase | Pekerjaan frontend | Menunggu |
|---|---|---|
| P2 | **Notifikasi push** untuk peringatan darurat (listrik padam, pompa kering) | Infrastruktur push di backend |
| — | Ringkasan patroli terakhir (foto tersimpan/terlewat) di kartu kamera | Saat ini hanya lewat peringatan INFO `PATROL_DONE`; perlu `metadata` alert di API atau entitas `capture_run` |
| — | Badge rentang ideal untuk sensor selain EC tangki | Ambang dari tim agronomi |
| — | Grafik riwayat jangka panjang yang akurat | Endpoint agregasi min/avg/max |
| — | Perubahan data master langsung terlihat operator lain | Event realtime data master |
| Fase 3 | Form kalibrasi sensor & pompa, tabel panen per tanaman (+ kolomnya di ekspor CSV), metrik sistem | Data lab & kalibrasi |
| Fase 4 | Halaman "Aturan peringatan" | `/api/automation/rules` |
| ~~Fase 5~~ | ~~Halaman "Campur pupuk"~~ — milik layanan tim AI (28 Okt 2026) | — |
| Fase 6 | Kartu kamera berisi angka per stasiun (skor N/P/K, luas daun, tren) | Kontrak output final tim AI |
