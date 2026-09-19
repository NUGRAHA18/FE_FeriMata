# Celah backend (dicatat oleh frontend)

Acuan: backend `BE-melonSmart` commit `4984e5e`. Frontend tidak mengarang endpoint atau angka untuk
menutup celah di bawah; perilaku UI saat ini dicatat di tiap butir.

## Selisih kontrak

| Celah | Perilaku frontend |
|---|---|
| `DashboardOverview.latestAiDetection` disebut di `prompt-frontend.md` tetapi **tidak ada** di `DashboardOverviewResponse` backend. | Field dibuat opsional di skema zod. Kartu Kamera AI mengambil `GET /api/ai/detections?page=0&size=10` dan diperbarui realtime lewat `AI_DETECTION_CREATED`. |
| `recentActivity` hanya berisi teks (`summary` = `"ON DIST-PUMP on PANEL-01"`, `detail` = `"EXECUTED, requested by operator"`) tanpa field terstruktur. | Frontend mengurai pola teks itu untuk ikon status; bila pola berubah, entri tetap tampil mentah. Usulan: tambahkan `status`, `actuatorCode`, `severity` sebagai field. |

## Fitur yang belum ada

| Tidak ada di backend | Perilaku frontend |
|---|---|
| Refresh token (sesi 60 menit). | Peringatan 5 menit sebelum kedaluwarsa + tombol "Masuk ulang"; logout otomatis tepat saat `expiresAt`. |
| Endpoint yang menyajikan berkas gambar AI (`imageUrl` berupa path relatif). | URL relatif di-resolve ke `NEXT_PUBLIC_API_BASE_URL`; bila gagal dimuat tampil placeholder (ikon kamera + kode stasiun + "Gambar tidak dapat dimuat dari server"). |
| Konfigurasi interlock (tipe wajib durasi, grup eksklusif) tidak diekspos lewat API. | Tidak di-hardcode sebagai validasi. Durasi hanya diwajibkan frontend bila `maxRunSeconds` tidak null; pesan `INVALID_COMMAND` / `SAFETY_INTERLOCK` dari backend selalu ditampilkan. |
| Ambang agronomi / rentang ideal, skor kesehatan tanaman. | Tidak ditampilkan. Skor AI tampil apa adanya (bar netral, tanpa warna "baik/buruk"). Teks bantu kartu = waktu pembacaan terakhir. |
| Data cuaca luar. | Diganti "Kondisi dalam greenhouse" (suhu & kelembapan udara, cahaya). |
| Task / jadwal / siklus tanam (HST). | Kartu Task diganti "Aktivitas & Kontrol" (perintah aktuator & alert). |
| Perintah "ambil foto" / capture trolley dan stream kamera live (CCTV). | Tidak ada tombol capture; kartu kamera hanya menampilkan deteksi tersimpan. |
| Event realtime untuk alert di-acknowledge dan perubahan data master (rename/enable sensor/aktuator). | Cache diperbarui sendiri setelah `PATCH` berhasil. Operator lain baru melihat perubahan setelah reconnect / refetch overview. |
| Filter alert per sensor/perangkat/aktuator. | Tab "Aktivitas" di detail sensor hanya menyaring 10 alert aktif teratas dari overview (dijelaskan di UI). |
| Endpoint agregasi riwayat (min/avg/max per interval). | `/sensors/{id}/history` dibatasi `size ≤ 1000`. Frontend mengambil semua halaman bila total ≤ 5.000 titik (≤ 5 request), selebihnya menyampel 48 jendela waktu (≤ 48 request, 6 paralel) dan merata-rata per jendela — ditandai di keterangan grafik. |
| Daftar tipe deteksi AI. | Pilihan tipe = daftar tetap (`NUTRIENT_DEFICIENCY`, `DISEASE`) + tipe yang terlihat di data. |
| Endpoint `/api/dev/outbox` tidak terdokumentasi bentuk responsnya. | Dev Tools memvalidasi tiap item sebagai `ActuatorCommand` dan mengabaikan yang tidak cocok. |
