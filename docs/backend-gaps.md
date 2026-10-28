# Celah backend (dicatat oleh frontend)

Acuan: backend `BE-melonSmart` per 28 Oktober 2026 (setelah BE-1…BE-7). Frontend tidak
mengarang endpoint atau angka untuk menutup celah di bawah; perilaku UI saat ini dicatat di tiap butir.

## Sudah ditutup backend (frontend sudah memakainya)

| Dulu celah | Sekarang |
|---|---|
| `recentActivity` hanya teks bebas. | Backend mengirim `status`, `commandType`, `actuatorCode`, `deviceCode`, `actor`, `refId`. Frontend memakainya; parsing teks hanya cadangan untuk backend lama. |
| Tidak ada event realtime saat alert di-acknowledge. | Event `ALERT_UPDATED` di `/topic/alerts` dan `/topic/events`. Frontend mengeluarkan alert dari daftar dan mengambil ulang hitungan overview. |
| Tidak ada filter alert per sensor/perangkat/aktuator. | `GET /api/alerts?deviceId=&sensorId=&actuatorId=` (bisa digabung dengan `acknowledged` dan `severity`). Tab "Peringatan" di detail sensor memakainya. |
| `DashboardOverview.latestAiDetection` disebut tidak ada. | Sudah ada di backend; skema zod menerimanya. Kartu kamera tetap memakai daftar deteksi agar bisa digeser antar foto. |
| Tidak ada refresh token, ganti sandi, kelola pengguna. | `POST /api/auth/refresh`, `/logout`, `/change-password`, `/api/users` (ADMIN), peran ADMIN/OPERATOR/VIEWER. Frontend memperpanjang sesi diam-diam (7 hari); halaman Akun & Pengguna. |
| Tidak ada siklus tanam / HST. | `/api/cultivation` (siklus, fase, HST hari ini) dan `/api/plants` (tanaman perlakuan, pengamatan). Halaman Tanaman + kartu "Umur tanaman" di Beranda; badge EC tangki memakai `ecTargetMin/Max` fase berjalan. |
| Telemetri tumbuh tanpa batas. | Backend punya kebijakan retensi (hapus per batch). Tidak berdampak ke UI selain grafik riwayat hanya tersedia sepanjang masa retensi (dev 7 hari, Jetson 90 hari). |
| Berkas gambar AI tidak disajikan. | BE-2: `/captures/**` dengan token yang sama. Frontend mengambilnya sebagai blob (`fetchProtectedBlob`), bukan `<img src>`. |
| Tidak ada perintah patroli/pindah kereta/campur pupuk. | BE-1: aktuator virtual `TROLLEY-PATROL`, `TROLLEY-GOTO` + `supportedCommands`. Tombol per tipe di halaman Kontrol, "Patroli sekarang" di Beranda. Campur pupuk otomatis (`DOSING-LOOP`) dicabut 28 Okt: milik layanan tim AI, aktuatornya disembunyikan (`isRetiredActuator`). |
| Alasan gagal dari alat hanya teks bebas. | BE-7: `failureCode` di perintah; diterjemahkan ke bahasa petani. |

## Fitur yang belum ada

| Tidak ada di backend | Perilaku frontend |
|---|---|
| Konfigurasi interlock (tipe wajib durasi, grup eksklusif) tidak diekspos lewat API. | Tidak di-hardcode sebagai validasi. Durasi hanya diwajibkan frontend bila `maxRunSeconds` tidak null; pesan `INVALID_COMMAND` / `SAFETY_INTERLOCK` dari backend diterjemahkan ke bahasa sehari-hari. |
| Ambang agronomi / rentang ideal (suhu, kelembapan, cahaya, pH, NPK), skor kesehatan tanaman. | Tidak ditampilkan. Satu-satunya badge status: EC tangki dibanding `ecTargetMin/Max` fase tanam berjalan (Sesuai target / Terlalu encer / Terlalu pekat). Skor AI tampil apa adanya (bar netral, tanpa warna "baik/buruk"). |
| Data cuaca luar. | Diganti "Kondisi di dalam greenhouse" (suhu & kelembapan udara, cahaya). |
| Task / jadwal (capture terjadwal, aturan peringatan). | Kartu "Baru saja terjadi" (perintah ke alat & peringatan) sebagai pengganti kartu task di referensi. |
| Push notification. | Peringatan hanya terlihat saat aplikasi dibuka (pill/lonceng + drawer). |
| Stream kamera live (CCTV). | Kartu kamera hanya menampilkan foto tersimpan; patroli manual lewat "Patroli sekarang". |
| Event realtime untuk perubahan data master (rename/enable sensor/aktuator). | Cache diperbarui sendiri setelah `PATCH` berhasil. Operator lain baru melihat perubahan setelah reconnect / refetch overview. |
| Endpoint agregasi riwayat (min/avg/max per interval). | `/sensors/{id}/history` dibatasi `size ≤ 1000`. Frontend mengambil semua halaman bila total ≤ 5.000 titik, selebihnya menyampel 48 jendela waktu dan merata-rata per jendela. |
| Daftar tipe deteksi AI. | Pilihan = daftar tetap (`NUTRIENT_DEFICIENCY`, `DISEASE`) + tipe yang terlihat di data; label Indonesia di `lib/format.ts`. |
| Endpoint `/api/dev/outbox` tidak terdokumentasi bentuk responsnya. | Dev Tools memvalidasi tiap item sebagai `ActuatorCommand` dan mengabaikan yang tidak cocok. |
