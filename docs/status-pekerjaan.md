# Status Pekerjaan Frontend FertiMata — 31 Oktober 2026

Pelacak pekerjaan frontend. Disusun dari `BE-melonSmart/docs/status-pekerjaan.md` (bagian 3),
`BE-melonSmart/docs/rencana-pengembangan.md` (Fase 3–6), dan `docs/backend-gaps.md`.

Legenda prioritas: **P1** menghambat pemakaian di lapangan · **P2** perlu sebelum musim tanam penuh ·
**P3** perbaikan kualitas.

---

## 1. Menunggu: testing dengan petani

| Prio | Pekerjaan | Status |
|---|---|---|
| P1 | **Uji dengan pengguna petani** di ponsel sungguhan: ukuran huruf, kontras di bawah sinar matahari (terang & gelap), pemahaman bahasa, dan petunjuk Beranda. | ⏳ Menunggu jadwal uji di lapangan. Bukan pekerjaan teknis; hasilnya dicatat di sini sebagai butir baru. |

Yang perlu diamati saat uji: apakah petunjuk Beranda dibaca sampai habis, apakah banner offline dipahami
("data terakhir pukul …"), dan apakah mode sederhana sebaiknya aktif secara bawaan.

---

## 2e. Desain ulang tampilan — 31 Oktober 2026 (permintaan user)

Acuan: `docs/revisi-ui.txt`, `docs/screenshots/revisi-frontend.txt`, catatan palet tiga tema. Tanpa perubahan
business logic, API, atau sumber data.

| Prio | Pekerjaan | Hasil |
|---|---|---|
| P2 | **Kepala halaman ponsel** | `mobile-top-bar.tsx` diganti `shell/mobile-hero.tsx`: kepala hijau tua melengkung (salam, tanggal, status koneksi, jumlah peringatan, panduan, akun); kartu utama sedikit menumpang di bawahnya. Bottom nav putih dengan safe area. |
| P2 | **Kartu Beranda** | Kartu kondisi (suhu besar + kelembapan/cahaya/posisi kamera), kartu "Kontrol alat" (`dashboard/control-card.tsx`, `auto-mode-tile.tsx`), baris alat & aktivitas seragam (ikon di kotak hijau muda, nama semibold, status + waktu), ikon gambar baru di `components/icons/pictos.tsx` (menggantikan `lib/icons.tsx`). Desktop lebar (≥ 1280): "Angka sensor" selebar dua kolom di bawah kontrol & Alat; di bawah 1280 dua kolom seperti tablet. |
| P2 | **Tema** | Tema Hijau dihapus; tinggal Terang & Gelap dari token yang sama. Gelap memakai abu-abu netral (#121212 / #1e1e1e / #2a2a2a), bukan hijau tua; hijau hanya untuk aksen & status. Kontras teks dicek: semua pasangan token teks ≥ 4.5:1 di kedua tema (`--muted` terang digelapkan ke #5e7066). |
| P3 | **Rapikan di 360 px** | Daftar "yang dimatikan" di Pengaturan tidak lagi meluber; filter Peringatan turun baris alih-alih menyembunyikan opsi; kartu di halaman Sensor: ikon di atas nama supaya nama & satuan tidak terpotong; track saklar mati memakai `--line`. |

Diperiksa di Chrome (360 / 768 / 1024 / 1280 / 1440, terang & gelap): Beranda, Sensor, Alat, Kontrol, Jadwal siram,
Peringatan, Pengaturan, Tanaman, AI, Panduan — tanpa scroll horizontal dan tanpa error console. Belum diuji di
ponsel sungguhan.

## 2d. Jadwal siram — 29 Oktober 2026

| Prio | Pekerjaan | Hasil |
|---|---|---|
| P1 | **Halaman Jadwal siram** (`/jadwal-siram`) | Tombol bulat tengah bottom nav kini "Siram" (sebelumnya Tanaman; Tanaman pindah ke lembar Lainnya & rail). Juga di rail desktop. Semua peran bisa membuka; Pelihat hanya melihat. Isian jam & lama yang diketik (`components/ui/time-input.tsx`, menggantikan stepper +/− atas masukan user): jam 24 jam "HH:MM" dengan keyboard angka, titik dua otomatis ("0600"/"600"/"6.00" → 06:00), salah ketik tidak diam-diam diubah ("2575" tetap 25:75 → "Jam tidak valid, contoh 06:00"); lama dalam menit (koma boleh: 1,5 = 90 dtk), lebih dari `maxRunSeconds` pompa → pesan "Terlalu lama", tidak dijepit. Pilihan cepat jam 06:00/08:00/16:00/17:00 dan lama 3/5/10 menit tetap ada. Alasan batal/gagal dari `lastReasonCode` / `metadata.reasonCode` / `ActivityEntry.alertType+failureCode`. Panduan: bagian baru "Jadwal siram". |
| P1 | **Jadwal siram harian** | Kartu jadwal (awalnya di halaman Kontrol) (`components/actuators/irrigation-schedule.tsx`): jam (WIB) + lama (menit:detik) + catatan, saklar aktif per jam, ubah & hapus (dialog), "Berikutnya: besok 06:00", hasil terakhir Disiram / Dibatalkan demi keamanan: … / Terlewat (sistem mati) / Gagal: …. 409 `DUPLICATE_TIME` & `TOO_LONG` dibaca dari `details.reason`. Pelihat hanya melihat. Diambil ulang tiap menit. Peringatan `IRRIGATION_SKIPPED` diberi label. Panduan → Kontrol diperbarui. |
| P2 | **Skema dirampingkan** (backend menghapus field riset) | `growthPhase` tanpa rasio N:P:K, `cycleToday`/overview tanpa `treatmentPlantCount` & data siklus, `plant` hanya `id, code, name, description, active, createdAt, updatedAt`, skema pengamatan dihapus. Field siklus yang tidak dipakai UI dibuat opsional. |

## 2c. Penyederhanaan untuk petani — 29 Oktober 2026 (permintaan user)

Fitur riset dihapus dari UI; fokus ke kontrol. Backend belum menghapus endpoint-nya (tidak dipakai FE).

| Dihapus | Tetap / baru |
|---|---|
| Menu & halaman **Riset** (`/research`) dan **Kinerja** (`/metrics`), komponen & `lib/research.ts`, `lib/metrics.ts`, token warna seri grafik. | Kalibrasi sensor & pompa, CSV riwayat sensor & sampel lab. |
| Di **Tanaman**: kartu & editor fase (EC, N:P:K per fase), filter perlakuan, catat pengamatan & panen beserta riwayatnya, CSV pengamatan & panen, field riset di form tambah tanaman. | **Tanaman**: "Hari ke-N · fase" besar + fase berikutnya, tambah tanaman (nama bebas + catatan; backend membuat kode), **hapus tanaman** (`DELETE /plants/{id}`, dialog konfirmasi, Pelihat tanpa tombol). Konsep **siklus** dihapus: satu **Tanggal tanam** untuk seluruh greenhouse (`PUT /cultivation/transplant-date`), diminta di form Tambah tanaman saat tanaman pertama (PUT lalu POST); sesudahnya hanya ditampilkan ("Ditanam bersamaan pada …") dan bisa dikoreksi lewat "Ubah tanggal tanam" di kartu Umur tanaman. Kartu di Pengaturan dihapus; Beranda mengarah ke `/cultivation?tambah=1`. |
| Di **Beranda** kartu Umur tanaman: rasio N:P:K dan jumlah tanaman perlakuan. | Target EC fase tetap (acuan kartu tangki pupuk). |
| Endpoint/hook/tipe FE: pengamatan, panen, `/research/*` (kecuali CSV sampel lab), metrik sistem, edit fase/siklus/tanaman, daftar siklus. | Panduan: bagian Riset & Kinerja dihapus, bagian Tanaman disederhanakan, istilah °Brix & SD dihapus. |

## 2b. Selesai — 29 Oktober 2026 (Fase 3: kalibrasi, panen, metrik, CSV backend)

| Prio | Pekerjaan | Hasil |
|---|---|---|
| P2 | **Kalibrasi sensor** | Tab "Kalibrasi" di detail sensor (`components/sensors/calibration-panel.tsx`): status kalibrasi berlaku dalam bahasa sehari-hari (rata-rata selisih dengan lab = MAE), sampel lab (tambah/hapus, angka sensor boleh kosong → diisi backend), "Hitung dari sampel lab" = pratinjau `fit save=false`, lalu "Simpan & pakai" (`save=true`), cek di larutan standar (paged). R², RMSE, MAE, bias, batas Bland-Altman, kovariat, dan input model manual (R/SPSS) di "Info teknis". Pesan aturan backend yang sering muncul diterjemahkan (`lib/calibration.ts`). |
| P2 | **Kalibrasi pompa dosing** | Kartu "Takaran pompa" di detail aktuator bertipe `DOSING_PUMP`: debit berlaku, form ulangan (≥ 3, debit = total volume / total waktu dipratinjau), volume pupuk keluar 1/7/30 hari dari `/dispensed` (null → "Belum bisa dihitung"); CV%, tegangan di "Info teknis". |
| P2 | **`calibratedValue`** | Detail sensor: "Setelah dikoreksi lab: …" di bawah angka mentah; kartu daftar sensor: baris kecil "dikoreksi lab". Kolom `nilai_terkoreksi` di CSV riwayat. Null = tidak ditampilkan. |
| P2 | **Panen per buah** | Tombol "Catat panen buah" di tiap tanaman (tanggal, berat, °Brix, kekerasan + satuan, tebal daging, bahan kering; koma desimal diterima) dan daftar buah per tanaman. `components/cultivation/harvest.tsx`. Rekap panen pindah ke halaman Riset. |
| P2 | **Halaman Riset** (`/research`, menu "Riset", juga untuk Pelihat) | Pemilih siklus (bawaan: yang berjalan). Kurva pertumbuhan tinggi / jumlah daun per HST, satu garis per kelompok (K0, N−, P−, K−, SimonKori) dengan warna tetap `--series-1…5` (divalidasi CVD terang/hijau/gelap), legenda, pita ± SD opsional, tampilan tabel. Hasil panen per perlakuan: rata-rata ± SD lima ukuran + kalimat "N− 22% lebih ringan dari K0". FertiMata K0 vs SimonKori (berat, °Brix, tinggi HST terakhir). Catatan gejala terbaru per perlakuan. Unduh CSV pengamatan & panen. Data: `/research/observations` + `/plants` + `/research/harvests`; statistik di `lib/research.ts`. |
| P2 | **CSV dari backend** | Pengamatan (`observations.csv`), panen (`harvests.csv`, ikut filter perlakuan), sampel lab (`calibration-samples.csv`) diambil dengan token lalu disimpan sebagai blob (`fetchApiText` + `serverCsv`). Ekspor pengamatan buatan frontend dihapus. |
| P2 | **Halaman Kinerja sistem** (`/metrics`, menu "Kinerja") | Rentang 1/7/30 hari (backend membatasi ke masa simpan data mentah: Jetson 30, dev 7 hari; 409 `reason: RETENTION` → "Data rinci hanya disimpan N hari terakhir" dari `details.maxDays`). Per alat: data yang masuk (%), waktu hidup (%), batang kelengkapan harian; perintah berhasil (%) + tabel per aktuator; listrik (kWh); pupuk per pompa; air "belum ada alat ukur" bila null. Latensi p50/p95/maks, pesan diterima/diharapkan, catatan backend di "Info teknis". |
| P2 | **Riwayat jangka panjang** | Grafik memakai `/history/aggregate` (interval otomatis): garis = rata-rata, pita = min–maks, celah > 1,5 interval memutus garis. Rentang baru 30 & 90 hari. Tabel = min/rata-rata/maks per titik. Penyampelan 48 jendela dihapus. |
| P2 | **Realtime data master** | `SENSOR_UPDATED` dan `ACTUATOR_UPDATED` memperbarui cache daftar & detail (sensor baru ikut muncul; aktuator yang dicabut tidak muncul lagi; saklar `enabled` di overview). |
| P2 | **Notifikasi push** (Web Push/VAPID) | Kartu "Notifikasi di HP ini" di Akun untuk semua peran (`components/push/push-card.tsx`, `lib/push.ts`): izin hanya diminta dari klik, subscribe dengan `publicKey` server, POST ke `/push/subscriptions`; "Kirim notifikasi uji". Status: menyala / mati / diblokir (cara membuka izin) / tidak didukung / butuh https (`isSecureContext` false, mis. Jetson via http://IP) / iPhone belum dipasang ke Layar Utama / server belum punya kunci. Keluar (dan "Masuk lagi") mencabut langganan di server lalu di browser sebelum token dibuang. Kunci server diganti → langganan diperbarui diam-diam saat aplikasi dibuka. `sw.js`: handler `push` (CRITICAL = `requireInteraction`, badge `icons/badge-96.png`) dan `notificationclick` (fokus tab yang ada / pindah halaman / buka jendela). Di `next dev` service worker kini didaftarkan sebagai `/sw.js?cache=off` (push saja, tanpa cache) supaya bisa dicoba di localhost. |
| P2 | **Panduan penggunaan** (`/panduan`, semua peran) | Isi satu sumber di `lib/guide-content.ts` (juga dipakai petunjuk singkat Beranda; langkah terakhirnya menautkan ke Panduan). 11 bagian + Istilah, masing-masing: untuk apa, yang tampil di layar (label persis UI), yang perlu dilakukan, kalau ada masalah. Daftar isi kartu ber-ikon, akordeon satu-terbuka mengikuti `#anchor`, pencarian (semua kata harus cocok, tanpa beda besar/kecil), tombol "Ulangi petunjuk singkat Beranda", catatan khusus Pelihat. Ikon "?" kontekstual: rail desktop (menu "Panduan" sebelum Akun) dan top bar mobile → `/panduan#<bagian halaman ini>`. Rail kini bisa digulir (11 menu). Tangkapan layar 360/768/desktop di `docs/screenshots/panduan-*.png`; tanpa scroll horizontal di ketiganya. |
| P2 | **Sensor/aktuator nonaktif disembunyikan** (backend 29 Okt) | Daftar bawaan (`/sensors`, `/actuators`) kini hanya yang aktif. Kartu baru "Sensor & alat yang dimatikan" di Pengaturan (operator/admin) memakai `?includeDisabled=true` (cache terpisah `sensors-all` / `actuators-all`) dan menautkan ke halaman detail untuk diaktifkan lagi. `applySensor` / `applyActuator` di `lib/realtime/apply.ts` dipakai event realtime dan PATCH: dimatikan = keluar dari daftar bawaan, diaktifkan = masuk. |
| P2 | **Perintah tanpa jawaban (`NO_RESPONSE`)** | Dikenali dari `failureCode`, bukan teks: label "Alat tidak menjawab" berwarna kuning (hasil tidak diketahui), bukan "Gagal" merah — di pelacak perintah, riwayat perintah, dan "Baru saja terjadi". Entri overview memakai `ActivityEntry.failureCode`; peringatan memakai `Alert.metadata.failureCode` (judul & isi disusun dari kode + `relatedDeviceCode`/`relatedActuatorCode`, tanpa mencocokkan teks Inggris). Panduan → Kontrol diperbarui. |
| P3 | Test | `push.test.ts`, `push-card.test.tsx`, `history.test.ts`, `calibration.test.ts`, `research.test.ts`, test realtime data master, `countCsvRows`/`serverCsv`. |

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
| — | Ringkasan patroli terakhir (foto tersimpan/terlewat) di kartu kamera | Saat ini hanya lewat peringatan INFO `PATROL_DONE`; perlu `metadata` alert di API atau entitas `capture_run` |
| — | Badge rentang ideal untuk sensor selain EC tangki | Ambang dari tim agronomi |
| — | Ubah/hapus catatan panen dan cek drift yang salah ketik | Endpoint PATCH/DELETE di backend (lihat `backend-gaps.md`) |
| — | Riwayat jangka panjang dalam angka terkoreksi | Agregasi backend hanya menyimpan nilai mentah |
| Fase 4 | Halaman "Aturan peringatan" | `/api/automation/rules` |
| ~~Fase 5~~ | ~~Halaman "Campur pupuk"~~ — milik layanan tim AI (28 Okt 2026) | — |
| Fase 6 | Kartu kamera berisi angka per stasiun (skor N/P/K, luas daun, tren) | Kontrak output final tim AI |
