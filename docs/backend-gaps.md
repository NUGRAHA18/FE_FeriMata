# Celah backend (dicatat oleh frontend)

Acuan: backend `BE-melonSmart` per 31 Oktober 2026 (setelah BE-1…BE-7, Fase 3, agregasi riwayat, kontrak 31 Okt). Frontend tidak
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
| Tidak ada endpoint agregasi riwayat. | `GET /sensors/{id}/history/aggregate` (min/avg/max, interval otomatis). Grafik riwayat memakainya; rentang 30 & 90 hari ditambahkan. |
| Tidak ada event realtime data master. | `SENSOR_UPDATED`, `ACTUATOR_UPDATED`; cache daftar & detail diperbarui. |
| Tidak ada push notification. | `/api/push/*` (VAPID). Kartu "Notifikasi di HP ini" di Akun, service worker menampilkan & membuka notifikasi. |
| Tipe pompa yang dikalibrasi (`calibration.pump.types`) tidak diekspos. | `ActuatorResponse.pumpCalibratable` (31 Okt). Kartu "Takaran pompa" memakai flag ini; backend lama tanpa flag → cek `type === "DOSING_PUMP"`. |
| Pesan `BUSINESS_RULE_VIOLATION` kalibrasi berbahasa Inggris tanpa kode. | `details.reason` (31 Okt): NOT_CALIBRATABLE_PUMP, TOO_FEW_TRIALS, TRIALS_OR_FLOW_REQUIRED, INVALID_RANGE, TOO_FEW_SAMPLES, SINGULAR_MODEL, NO_RECENT_READING, COEFFICIENT_OUT_OF_RANGE. Diterjemahkan per kode di `lib/calibration.ts`; regex teks Inggris tinggal cadangan untuk backend lama. |
| Cek drift yang salah ketik tidak bisa dihapus. | `DELETE /api/sensors/{sensorId}/drift-checks/{checkId}` (31 Okt). Tombol tempat sampah + konfirmasi di "Cek di larutan standar" (operator/admin). |
| HST dihitung dari tanggal tanam pindah. | Hari ke-0 = tanggal semai (31 Okt): `PUT /api/cultivation/sowing-date` `{ sowingDate }`, respons `cycle.sowingDate` / `cultivation.sowingDate`. Label "Tanggal semai" + "Hari ke-0 = hari benih disemai". Respons lama berisi `transplantDate` dibaca sebagai `sowingDate`; penulisan hanya lewat endpoint baru (backend lama → 404). |
| Lama siram jadwal tetap. | Lama diputuskan fuzzy AI saat jam tiba (31 Okt). `durationSeconds` = lama cadangan; `lastDurationSeconds` + `lastDurationSource` (AI/FALLBACK/MANUAL) tampil sebagai "Disiram 1 mnt 25 dtk (ditentukan AI)". `AI_NO_WATER_NEEDED` = "Tidak perlu siram" (normal, tidak merah); `AI_CAPPED`, `AI_NOT_CONFIGURED`, `AI_INPUTS_NOT_READY`, `AI_UNAVAILABLE` diterjemahkan; peringatan `IRRIGATION_AI_FALLBACK` berlabel. |
| Kalibrasi belum ada. | `/calibration-samples` (+ CSV di `/sensors/{id}/calibration-samples.csv`), `/calibrations(/fit)`, `/drift-checks`, kalibrasi pompa + `/dispensed`. Dipakai frontend. Modul riset (`/research/*`) dan metrik sistem (`/metrics/system`) dihapus backend 29 Okt 2026 bersama UI-nya. |

## Fitur yang belum ada

| Tidak ada di backend | Perilaku frontend |
|---|---|
| Konfigurasi interlock (tipe wajib durasi, grup eksklusif) tidak diekspos lewat API. | Tidak di-hardcode sebagai validasi. Durasi hanya diwajibkan frontend bila `maxRunSeconds` tidak null; pesan `INVALID_COMMAND` / `SAFETY_INTERLOCK` dari backend diterjemahkan ke bahasa sehari-hari. |
| Ambang agronomi / rentang ideal (suhu, kelembapan, cahaya, pH, NPK), skor kesehatan tanaman. | Tidak ditampilkan. Satu-satunya badge status: EC tangki dibanding `ecTargetMin/Max` fase tanam berjalan (Sesuai target / Terlalu encer / Terlalu pekat). Skor AI tampil apa adanya (bar netral, tanpa warna "baik/buruk"). |
| Data cuaca luar. | Diganti "Kondisi di dalam greenhouse" (suhu & kelembapan udara, cahaya). |
| Task / jadwal (capture terjadwal, aturan peringatan). | Kartu "Baru saja terjadi" (perintah ke alat & peringatan) sebagai pengganti kartu task di referensi. |
| Push hanya jalan di https (atau localhost). | Jetson diakses lewat http://IP: kartu notifikasi meminta admin memasang domain. |
| Stream kamera live (CCTV). | Kartu kamera hanya menampilkan foto tersimpan; patroli manual lewat "Patroli sekarang". |
| Ubah/hapus catatan panen (`/plants/{id}/harvests`). Hanya GET/POST. | Salah ketik tidak bisa diperbaiki dari aplikasi. Sampel lab dan cek drift bisa dihapus (DELETE ada). |
| Agregasi riwayat hanya nilai mentah (tanpa `calibratedValue`). | Keterangan grafik menyebut "angka mentah, belum dikoreksi kalibrasi". |
| `notes` metrik berbahasa Inggris tanpa kode. | Hanya di "Info teknis". |
| Daftar metric key kovariat yang valid untuk satu sensor. | Isian teks bebas (dipisah koma) di "Info teknis". |
| Daftar tipe deteksi AI. | Pilihan = daftar tetap (`NUTRIENT_DEFICIENCY`, `DISEASE`) + tipe yang terlihat di data; label Indonesia di `lib/format.ts`. |
| Endpoint `/api/dev/outbox` tidak terdokumentasi bentuk responsnya. | Dev Tools memvalidasi tiap item sebagai `ActuatorCommand` dan mengabaikan yang tidak cocok. |
