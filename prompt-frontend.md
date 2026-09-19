# Prompt untuk Claude Code — Frontend Smart Melon (FERTIMATA)

> Salin seluruh isi di bawah garis ke sesi Claude Code di repositori frontend. Lampirkan juga
> `docs/referensi-ui1.png` dan `docs/referensi-ui2.png` (salin ke repo frontend, mis. `docs/`), serta
> `docs/hasil-penyesuaian-1.md` dari repo backend bila ingin konteks hardware yang lebih lengkap.
>
> Sumber kebenaran kontrak di bawah ini adalah kode backend pada commit `4984e5e`. Bila backend
> berubah, perbarui bagian **Kontrak API** di sini dulu.

---

## Peran dan tujuan

Kamu membangun **frontend operator console Smart Melon (FERTIMATA Rev A)**: PWA untuk memantau dan
mengendalikan greenhouse melon dengan fertigasi otomatis. Backend (Spring Boot) sudah selesai dan
**tidak boleh diasumsikan punya endpoint selain yang tercantum di prompt ini**. Kalau sebuah fitur UI
butuh data yang tidak ada di backend, jangan mengarang endpoint dan jangan memalsukan angka —
tampilkan apa adanya, sembunyikan, atau tandai sebagai "belum tersedia", lalu catat di
`docs/backend-gaps.md`.

Sebelum menulis kode: baca prompt ini sampai habis, lihat kedua gambar referensi, lalu buat rencana
singkat (struktur folder, daftar halaman, urutan pengerjaan) dan tunjukkan ke saya.

## Stack

- **Next.js (App Router) + TypeScript (strict)**, dijalankan sebagai PWA.
- **Tailwind CSS** untuk styling; komponen dasar boleh dari shadcn/ui (Radix) — sesuaikan ke gaya
  referensi, jangan pakai tampilan default-nya mentah-mentah.
- **TanStack Query** untuk data REST (cache, refetch, invalidasi).
- **@stomp/stompjs** untuk realtime (STOMP over WebSocket native, **bukan** SockJS).
- **Recharts** untuk grafik riwayat sensor.
- **lucide-react** untuk ikon (ikon garis tipis seperti di referensi).
- **zod** untuk memvalidasi respons API di batas jaringan.
- `next.config` → `output: 'standalone'`. Aplikasi ini akan berjalan di **Jetson Orin Nano 8 GB**
  yang juga menjalankan backend, PostgreSQL, dan inferensi AI — jaga bundle tetap ramping, hindari
  library berat (tidak perlu map library, tidak perlu chart library kedua).
- Bahasa antarmuka: **Bahasa Indonesia**. Zona waktu tampilan: **Asia/Jakarta (WIB)**. Semua
  timestamp dari backend adalah ISO-8601 UTC.

Konfigurasi lewat env:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080      # tanpa /api
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_SITE_NAME=Greenhouse Melon            # judul header
NEXT_PUBLIC_SITE_LOCATION=<lokasi greenhouse>     # teks lokasi di kartu kondisi
```

Backend mengizinkan CORS hanya dari `FRONTEND_URL` (default `http://localhost:3000`), jadi jalankan
dev server di port 3000.

---

## Arah desain (hasil analisis gambar referensi)

Referensi: `referensi-ui1.png` (tiga layar mobile: Home, Home ter-scroll, Analytic) dan
`referensi-ui2.png` (dashboard tablet "Greenhouse Monitoring"). Tiru **bahasa visualnya**, bukan
kontennya — konten referensi (cuaca luar, wind, task berkebun, "Plant Health 94%") tidak ada di
backend kita; pemetaannya ada di bagian berikut.

### Gaya visual

- **Latar** abu-abu terang netral (±`#E8E8E8`–`#ECECEC`), **kartu** sedikit lebih terang
  (±`#F4F4F4`/putih transparan), **radius besar** (±20–24 px kartu, ±12 px tombol/chip), bayangan
  sangat halus atau tanpa bayangan — kedalaman datang dari perbedaan tone, bukan border tebal.
- **Aksen utama hijau** (±`#2F9E55`, dengan gradasi halus ke hijau lebih terang) — dipakai hemat:
  logo bulat, satu kartu "hero" yang di-highlight, progress bar, centang sukses, titik status online.
- **Hitam pekat** (±`#1C1C1C`) untuk elemen aktif: pill navigasi aktif, tombol "Alert" di header,
  segmented control terpilih.
- **Kuning/amber** untuk peringatan: titik status + chip latar amber pucat berikon ⚠ ("Signal issue
  since 08:02 AM"). Tambahkan **merah** untuk CRITICAL (tidak ada di referensi, tapi dibutuhkan).
- **Tipografi** sans modern (Inter atau Geist). Angka metrik **besar dan tipis** (weight 300–400,
  ±40–56 px) dengan **satuan lebih kecil dan abu-abu** tepat di sebelahnya (`19°C`, `65%`). Label
  kartu kecil weight 500; teks bantu kecil abu-abu.
- **Kartu metrik**: ikon garis di kiri atas, label, nilai besar + satuan, satu baris teks bantu di
  bawah, dan **tombol persegi kecil berikon ↗ di pojok kanan atas** untuk membuka detail.
- **Item daftar perangkat**: titik status berwarna, nama tebal, baris kedua `#KODE • Tipe` abu-abu,
  chip peringatan opsional di bawahnya.
- Dukung **dark mode** dengan token warna di CSS variables (referensi hanya light; turunkan
  versi gelapnya dengan kontras yang sama).

### Layout

**Tablet/desktop (≥ 1024 px)** — mengikuti `referensi-ui2.png`:

- **Rail navigasi vertikal kiri** berisi tombol ikon persegi membulat (item aktif hitam, lainnya
  abu-abu); logo hijau bulat di atas; Pengaturan dan Profil di bawah.
- **Header**: judul besar (`NEXT_PUBLIC_SITE_NAME`) di kiri; di kanan **pill hitam "N Alert ↗"**
  (jumlah alert belum di-acknowledge) dan **dropdown pemilih plot** (pengganti "Sector").
- **Grid 3 kolom**:
  1. Kolom kiri lebar: kartu besar *Kondisi Greenhouse + Denah*, lalu grid 3×2 kartu metrik.
  2. Kolom tengah: kartu *Perangkat* (daftar ter-scroll).
  3. Kolom kanan: kartu *Kamera/AI* di atas, kartu *Aktivitas & Kontrol* di bawah.

**Mobile (< 768 px)** — mengikuti `referensi-ui1.png`:

- Top bar: logo hijau bulat kiri; kanan tombol lonceng (titik merah bila ada alert) dan avatar.
- Kartu kondisi, dropdown plot, grid 3 kolom kartu metrik ringkas, lalu kartu Perangkat, Kamera,
  Aktivitas — semua satu kolom.
- **Bottom navigation melayang** berbentuk pill abu-abu dengan item aktif berupa kotak hitam.
- Halaman detail (layar ke-3 referensi): judul di tengah, tombol ⋮ kanan, **tab bergaris bawah**
  (Detail, Riwayat, Perangkat, Aktivitas), dropdown pemilih di bawah tab.

Tablet potret (768–1023 px): 2 kolom, rail tetap di kiri.

---

## Pemetaan konten referensi → data backend kita

| Elemen di referensi | Di aplikasi kita | Sumber data |
|---|---|---|
| Lokasi, tanggal, jam | Lokasi dari env, tanggal & jam lokal WIB berjalan | client |
| Cuaca luar (24°C, Sunny, H/L) | **Kondisi dalam greenhouse**: suhu udara besar, kelembapan udara, intensitas cahaya | `air.temperature`, `air.humidity`, `light.illuminance` |
| "Spinach Garden 08" / Sector dropdown | **Pemilih plot: Plot A / Plot B** — mengganti nilai kartu metrik tanah | prefix metric key `soil_a.` / `soil_b.` |
| Denah lahan (PL-02J, PL-70T) | **Denah greenhouse SVG** buatan sendiri: Plot A & B, rel kamera utara→selatan dengan 12 stasiun ST-01…ST-12 (jarak 60 cm), posisi trolley, tangki fertigasi. Plot terpilih berwarna hitam seperti PL-02J | `trolley.station` (0 = HOME), `trolley.home_limit`, `trolley.end_limit` |
| Kartu hijau "Plant Health 94%" | **Kartu hero "Status Sistem"**: `online/total` perangkat + sumber daya (PLN/Baterai). Hijau bila semua online & PLN; amber bila ada perangkat OFFLINE/UNKNOWN; merah bila `onBackupPower` | `devices`, `powerSource`, `onBackupPower` |
| Wind, Temperature, pH, Humidity, Soil Moisture | Kartu metrik plot terpilih: **Kelembapan tanah, Suhu tanah, pH tanah, EC tanah, N, P, K** (+ bila muat: EC & pH tangki) | `soil_x.*`, `tank.ec`, `tank.ph` |
| Teks bantu di kartu ("Maintain consistent between 15–20°C") | **Waktu pembacaan terakhir** ("diperbarui 12 dtk lalu") dan nama sensor. **Jangan** menulis rentang ideal/saran agronomi — backend sengaja tidak punya ambang, dan frontend juga tidak boleh mengarangnya | `recordedAt` |
| Device card (Sensor 4, Camera 5) | Kartu **Perangkat**: ringkasan Total / Online / Sensor / Aktuator, lalu 5 perangkat logis dengan titik status, `#DEVICE-CODE • tipe`, "terakhir terlihat", dan chip amber/merah untuk OFFLINE, UNKNOWN, atau daya cadangan | `/api/dashboard/overview` |
| Camera card (foto, 1/5, ◀ 📷 🔔 ▶) | Kartu **Kamera AI**: gambar deteksi terbaru, label stasiun, pager antardeteksi terbaru (1/N), dan **tiga bar skor N/P/K stress** (0–1). Tombol ▶/◀ menggeser deteksi; tombol 🔔 membuka alert. **Tidak ada tombol "ambil foto"** — backend belum punya perintah capture | `/api/ai/detections` |
| Task card (progress 40%, checklist) | Kartu **Aktivitas**: feed perintah aktuator & alert terbaru dengan ikon status (✓ hijau EXECUTED, spinner SENT/PENDING, ✕ merah FAILED, ⚠ alert). Progress bar = jumlah aktuator yang sedang ON dari total | `recentActivity`, `actuators` |
| Layar Analytic (tab, 92% health, CCTV, marker Section, d-pad) | Halaman **Detail Sensor** dan **AI/Kamera**. Marker "Section 1–8" di atas gambar → marker stasiun ST-01…ST-12 pada denah. **Jangan buat d-pad/joystick yang langsung menggerakkan trolley** (lihat Kontrol Aktuator) | lihat halaman |

---

## Halaman

1. **`/login`** — kartu tengah bergaya sama, username + password. Tampilkan pesan dari `message`
   bila 401.
2. **`/` Dashboard** — layout di atas. Render awal dari satu request `GET /api/dashboard/overview`,
   lalu hidup lewat WebSocket.
3. **`/sensors`** — semua sensor dikelompokkan per perangkat (grid kartu metrik gaya yang sama).
   Sensor `autoRegistered` atau `enabled=false` diberi badge. Ini jaring pengaman: sensor baru dari
   katalog harus muncul di sini **tanpa perubahan kode**.
4. **`/sensors/[id]`** — halaman detail bergaya layar Analytic: nilai terakhir besar, tab
   **Detail** (nama, kode, metric key, satuan, perangkat, `metadata` sebagai tabel key-value),
   **Riwayat** (grafik garis Recharts + pilihan rentang 1 j / 6 j / 24 j / 7 h), **Perangkat**,
   **Aktivitas**. Operator bisa mengedit nama/satuan/deskripsi/enabled lewat `PATCH`.
5. **`/actuators`** — **Kontrol Aktuator**, dikelompokkan per perangkat (PANEL-01, RIO-TANK-01).
   Detail di bagian Kontrol Aktuator.
6. **`/actuators/[id]`** — status, metadata (alamat Modbus/kanal), pengaturan (`enabled`,
   `maxRunSeconds`), dan tabel riwayat perintah berhalaman.
7. **`/devices`** dan **`/devices/[id]`** — liveness, sumber daya, sensor & aktuator milik perangkat.
8. **`/alerts`** — daftar berhalaman, filter severity & status acknowledge, tombol Acknowledge.
   Juga tersedia sebagai **drawer** dari pill "N Alert" di header.
9. **`/ai`** — deteksi AI: filter stasiun (ST-01…ST-12, klik marker di denah), tipe deteksi;
   kartu per deteksi dengan gambar, stasiun, waktu, dan skor.

Item navigasi (rail/bottom nav): Beranda, Sensor, Kontrol, AI/Kamera, Alert; Pengaturan & Profil
di bawah rail (profil = `/api/auth/me` + logout).

---

## Kontrak API (sumber kebenaran)

Base path `/api`. Semua endpoint kecuali login wajib `Authorization: Bearer <token>`. Swagger UI
backend: `http://localhost:8080/swagger-ui.html` — gunakan untuk memverifikasi, jangan untuk
menebak endpoint tambahan. Tuliskan tipe-tipe di bawah ke `src/lib/api/types.ts` + skema zod.

Konvensi: `Instant` = string ISO-8601; `BigDecimal` = number; field bisa `null`.

### Autentikasi

```
POST /api/auth/login   { username, password }  → LoginResponse
GET  /api/auth/me                              → User
```

```ts
type LoginResponse = { accessToken: string; tokenType: 'Bearer'; expiresIn: number; expiresAt: string; user: User };
type User = { id: number; username: string; fullName: string | null; role: 'OPERATOR'; enabled: boolean };
```

- Token berlaku **60 menit, tidak ada refresh token**. Simpan token + `expiresAt`; jadwalkan logout
  otomatis saat kedaluwarsa dan beri peringatan 5 menit sebelumnya. Respons 401 di mana pun →
  hapus sesi, arahkan ke `/login?next=<path>`.
- Hanya satu role: `OPERATOR` (semua fitur boleh diakses).

### Dashboard

```
GET /api/dashboard/overview → DashboardOverview
```

```ts
type DashboardOverview = {
  system: { mode: 'DEVELOPMENT' | 'PRODUCTION'; messagingTransport: string; messagingConnected: boolean; generatedAt: string };
  devices: { total: number; online: number; offline: number; unknown: number; items: DeviceStatus[] };
  sensors: { total: number; enabled: number; latestReadings: SensorReading[] };
  actuators: ActuatorStatus[];
  alerts: { unacknowledged: number; critical: number; warning: number; active: Alert[] }; // active: maks 10
  latestAiDetection: AiDetection | null;
  recentActivity: { kind: 'ACTUATOR_COMMAND' | 'ALERT'; at: string; summary: string; detail: string }[]; // maks 15
};
```

Bila `system.mode === 'DEVELOPMENT'` tampilkan badge kecil "Mode pengembangan — data simulasi".
Bila `messagingConnected === false` tampilkan banner amber: perintah aktuator tidak akan sampai.

### Perangkat

```
GET  /api/devices              → Device[]
GET  /api/devices/{id}         → Device
GET  /api/devices/{id}/status  → DeviceStatus
POST /api/devices              { deviceCode, name, type?, description? } → 201 Device
```

```ts
type DeviceLiveness = 'ONLINE' | 'OFFLINE' | 'UNKNOWN'; // UNKNOWN = terdaftar tapi belum pernah melapor
type Device = { id: number; deviceCode: string; name: string; type: string | null; status: DeviceLiveness;
  lastSeenAt: string | null; powerSource: string | null; powerSourceUpdatedAt: string | null;
  description: string | null; createdAt: string; updatedAt: string };
type DeviceStatus = { id: number; deviceCode: string; status: DeviceLiveness; lastSeenAt: string | null;
  secondsSinceLastSeen: number | null; offlineTimeoutSeconds: number;
  powerSource: string | null; powerSourceUpdatedAt: string | null; onBackupPower: boolean };
```

- Tampilkan "terakhir terlihat 40 dtk lalu · dianggap offline setelah 120 dtk" memakai
  `offlineTimeoutSeconds` dari backend — **jangan hardcode timeout**.
- `powerSource` teks bebas (`MAINS`, `BATTERY`, `UNKNOWN`, …). Label: MAINS → "PLN", BATTERY →
  "Baterai", lainnya tampilkan apa adanya. Keputusan "daya cadangan" pakai `onBackupPower`, bukan
  perbandingan string di frontend.

Perangkat Rev A (5 perangkat logis per domain gangguan):

| Kode | Isi |
|---|---|
| `JETSON-01` | Otak sistem; posisi & limit trolley, suhu SoC; pelapor sumber daya |
| `PZEM-01` | Tegangan & frekuensi PLN, arus/daya/energi/faktor daya pompa distribusi |
| `PANEL-01` | Relay panel: `DIST-PUMP`, `LED-ILLUMINATION`, `TROLLEY-RUN` (maks 120 dtk), `TROLLEY-DIR` |
| `GREENHOUSE-01` | Sensor tanah plot A & B (7-in-1), suhu & kelembapan udara, cahaya |
| `RIO-TANK-01` | EC & pH flow cell, float gentong & tangki mixing; `DOSING-N/P/K`, `FILL-VALVE`, `SAMPLING-PUMP` |

### Sensor & pembacaan

```
GET   /api/sensors?deviceId=              → Sensor[]
GET   /api/sensors/{id}                   → Sensor
GET   /api/sensors/{id}/latest            → SensorReading   (404 bila belum ada pembacaan)
GET   /api/sensors/{id}/history?from=&to=&page=0&size=100   → Page<SensorReading>
POST  /api/sensors                        → 201 Sensor
PATCH /api/sensors/{id}  { name?, type?, unit?, description?, enabled?, metadata? } → Sensor
```

```ts
type Sensor = { id: number; deviceId: number; deviceCode: string; code: string; metricKey: string; name: string;
  type: string | null; unit: string | null; enabled: boolean; autoRegistered: boolean; description: string | null;
  metadata: Record<string, unknown> | null; createdAt: string; updatedAt: string };
type SensorReading = { id: number; sensorId: number; sensorCode: string; metricKey: string; deviceId: number;
  deviceCode: string; value: number | null; textValue: string | null; unit: string | null;
  recordedAt: string; receivedAt: string };
type Page<T> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number; last: boolean };
```

- `history`: default 24 jam terakhir bila `from`/`to` kosong; `size` maks **1000**; urutan
  **terbaru dulu** — balik urutannya sebelum digambar. Untuk rentang 7 hari ambil beberapa halaman
  atau lakukan downsampling di client; jangan menembak ribuan request.
- `value` bisa null (metrik non-numerik → `textValue`).
- `metadata` bersifat informasi saja (alamat Modbus, kanal, model sensor).

Metric key Rev A (untuk konfigurasi tata letak dashboard):

```
GREENHOUSE-01  soil_a.moisture (%)  soil_a.temperature (C)  soil_a.ec (uS/cm)  soil_a.ph (pH)
               soil_a.nitrogen / soil_a.phosphorus / soil_a.potassium (mg/kg)   — sama untuk soil_b.*
               air.temperature (C)  air.humidity (%RH)  light.illuminance (lux)
RIO-TANK-01    tank.ec (mS/cm)  tank.ph (pH)  tank.supply_float  tank.mixing_float
PZEM-01        mains.voltage (V)  mains.frequency (Hz)  pump.current (A)  pump.power (W)
               pump.energy (kWh)  pump.power_factor
JETSON-01      trolley.station (0 = HOME, 1–12 = ST-01…ST-12)  trolley.home_limit  trolley.end_limit
               jetson.soc_temperature (C)
```

**Aturan penting:** daftar di atas adalah *data katalog* yang bisa berubah tanpa perubahan backend.
Taruh pemetaan metric key → kartu dashboard di **satu berkas** `src/config/dashboard-layout.ts`.
Kartu yang metric key-nya tidak ada di data tampil "—", bukan error. Halaman `/sensors` menampilkan
semua sensor secara generik sehingga sensor baru tetap terlihat. Satuan diambil dari data
(`unit`), bukan dari konstanta; tampilkan `C` sebagai `°C` dan `uS/cm` sebagai `µS/cm`.

### Aktuator & perintah

```
GET   /api/actuators?deviceId=                   → Actuator[]
GET   /api/actuators/{id}                        → Actuator
GET   /api/actuators/{id}/status                 → ActuatorStatus
PATCH /api/actuators/{id}  { name?, type?, description?, enabled?, maxRunSeconds?, metadata? } → Actuator
POST  /api/actuators/{id}/commands  { command, parameters? }  → 202 ActuatorCommand
GET   /api/actuators/{id}/commands?page=0&size=20            → Page<ActuatorCommand>
```

```ts
type Actuator = { id: number; deviceId: number; deviceCode: string; code: string; name: string; type: string | null;
  enabled: boolean; currentState: string | null; stateUpdatedAt: string | null; maxRunSeconds: number | null;
  description: string | null; metadata: Record<string, unknown> | null; createdAt: string; updatedAt: string };
type ActuatorStatus = { id: number; code: string; enabled: boolean; currentState: string | null;
  stateUpdatedAt: string | null; deviceCode: string };
type CommandStatus = 'PENDING' | 'SENT' | 'EXECUTED' | 'FAILED' | 'CANCELLED';
type ActuatorCommand = { id: number; commandUid: string; actuatorId: number; actuatorCode: string; deviceId: number;
  deviceCode: string; commandType: string; parameters: Record<string, unknown> | null;
  source: 'OPERATOR' | 'AUTOMATION' | 'SYSTEM'; requestedBy: string | null; status: CommandStatus;
  requestedAt: string; sentAt: string | null; executedAt: string | null; errorMessage: string | null };
```

`maxRunSeconds` pada PATCH: `0` menghapus batas. `ActuatorStatus` hanya dipakai di dashboard
overview dan event realtime; gabungkan ke objek `Actuator` berdasarkan `id`.

### Alert

```
GET   /api/alerts?acknowledged=&severity=&page=0&size=20  → Page<Alert>   (terbaru dulu)
GET   /api/alerts/{id}                                   → Alert
PATCH /api/alerts/{id}/acknowledge                       → Alert  (409 bila sudah di-acknowledge)
```

```ts
type Alert = { id: number; type: string; severity: 'INFO' | 'WARNING' | 'CRITICAL'; title: string; message: string;
  source: 'SYSTEM' | 'DEVICE' | 'AUTOMATION' | 'OPERATOR';
  relatedDeviceId: number | null; relatedDeviceCode: string | null; relatedSensorId: number | null;
  relatedSensorCode: string | null; relatedActuatorId: number | null; relatedActuatorCode: string | null;
  acknowledged: boolean; acknowledgedBy: string | null; acknowledgedAt: string | null; createdAt: string };
```

`type` teks bebas. Yang saat ini dibuat backend: `DEVICE_OFFLINE`, `DEVICE_RECOVERED`,
`ACTUATOR_COMMAND_FAILED`, `TELEMETRY_REJECTED`, `POWER_BACKUP`, `POWER_RESTORED`,
`DEVICE_REPORTED`; dari edge agent misalnya `SSR_SHORT`, `PUMP_DRY_RUN`, `DOSING_NOT_CONVERGING`,
`TROLLEY_LIMIT_HIT`, `MODBUS_TIMEOUT`. Beri label Indonesia untuk yang dikenal, tampilkan mentah
untuk yang lain. Tidak ada event realtime untuk acknowledge — perbarui cache lokal setelah PATCH.
Tautkan alert ke halaman perangkat/sensor/aktuator terkait bila id-nya ada.

### AI

```
GET /api/ai/detections?stationCode=&deviceId=&detectionType=&page=0&size=20 → Page<AiDetection> (terbaru dulu)
GET /api/ai/detections/{id}                                                 → AiDetection
```

```ts
type AiDetection = { id: number; deviceId: number; deviceCode: string; plantId: number | null; plantCode: string | null;
  detectionType: string; label: string | null; confidence: number | null;
  scores: Record<string, number> | null;   // mis. { Leaf_N_stress: 0.71, Leaf_P_stress: 0.12, Leaf_K_stress: 0.64 }
  stationCode: string | null;              // ST-01 … ST-12
  captureId: string | null; imageUrl: string | null; metadata: Record<string, unknown> | null;
  detectedAt: string; createdAt: string };
```

- Filter bersifat **eksklusif** (prioritas: `stationCode`, lalu `deviceId`, lalu `detectionType`) —
  jangan menggabungkan lebih dari satu dan berharap backend meng-AND-kan.
- Hasil multi-label: `label` null, `scores` terisi (tiga sigmoid independen, masing-masing 0–1,
  **tidak** berjumlah 1). Tampilkan sebagai tiga bar terpisah dengan persentase. Hasil single-label:
  tampilkan `label` + `confidence`.
- **Jangan menerapkan ambang** ("defisiensi N!") di frontend — backend dan tim agronomi belum
  menetapkannya. Tampilkan skor apa adanya.
- `imageUrl` bisa path relatif (mis. `/captures/2026-09-17/ST-03.jpg`) dan **backend tidak
  menyajikan berkas gambar**. Tampilkan gambar bila bisa dimuat, fallback ke placeholder bergaya
  (ikon kamera + kode stasiun) bila gagal. Catat di `backend-gaps.md`.

### Format error (semua endpoint)

```ts
type ApiError = { timestamp: string; status: number; error: string; message: string; path: string;
  details?: Record<string, unknown> };
```

Kode `error`: `VALIDATION_ERROR`, `MALFORMED_REQUEST`, `INVALID_COMMAND` (400),
`SAFETY_INTERLOCK`, `BUSINESS_RULE_VIOLATION`, `RESOURCE_CONFLICT` (409), `RESOURCE_NOT_FOUND`
(404), `AUTHENTICATION_FAILED` (401), `ACCESS_DENIED` (403), `MESSAGING_ERROR` (503),
`DATABASE_ERROR`, `INTERNAL_ERROR` (500). Untuk `VALIDATION_ERROR`, `details` berisi pesan per
field — petakan ke field form. Buat satu kelas `ApiRequestError` di klien HTTP.

---

## Realtime (STOMP)

- URL `NEXT_PUBLIC_WS_URL` (`ws://host:8080/ws`), STOMP native (bukan SockJS).
- Autentikasi di frame CONNECT: `connectHeaders: { Authorization: 'Bearer <token>' }`. Buat ulang
  koneksi setelah login; putuskan saat logout/expired.
- Envelope: `{ event: string; timestamp: string; data: T }`.

| Destination | `event` | `data` |
|---|---|---|
| `/topic/telemetry` | `SENSOR_READING_UPDATED` | `{ deviceId, deviceCode, recordedAt, readings: SensorReading[] }` |
| `/topic/devices` | `DEVICE_STATUS_CHANGED` | `DeviceStatus` |
| `/topic/actuators` | `ACTUATOR_STATUS_CHANGED` | `ActuatorStatus` |
| `/topic/actuators/commands` | `ACTUATOR_COMMAND_UPDATED` | `ActuatorCommand` |
| `/topic/alerts` | `ALERT_CREATED` | `Alert` |
| `/topic/ai` | `AI_DETECTION_CREATED` | `AiDetection` |
| `/topic/events` | semua di atas | — |

Aturan:

- **REST untuk query awal, WebSocket untuk perubahan — jangan polling.** Event memperbarui cache
  TanStack Query secara langsung (`setQueryData`), bukan memicu refetch untuk setiap pesan.
- Simulator dev mengirim telemetri tiap 10 detik untuk 31 metrik: update harus murah (normalisasi
  per `sensorId`, hindari re-render seluruh dashboard).
- Setiap kali **reconnect**, refetch `/api/dashboard/overview` untuk menutup celah event yang
  terlewat. Hitungan ringkasan (online/offline, jumlah alert) dihitung ulang di client dari event.
- Tampilkan indikator koneksi realtime kecil (titik hijau/amber) di header; saat terputus, nilai
  tetap tampil dengan penanda "data mungkin tidak terkini".
- Event untuk tipe yang tidak dikenal harus diabaikan dengan aman (backend boleh menambah tipe).

---

## Kontrol aktuator — aturan keselamatan (wajib)

Dashboard ini **mengendalikan pompa, dosing nutrisi, dan motor trolley sungguhan**. Perlakukan
setiap tombol sebagai operasi berisiko.

1. **Status aktuator = status yang dilaporkan perangkat** (`currentState`, `stateUpdatedAt`), bukan
   status yang diminta. **Tidak ada optimistic update.** `currentState` null → tampilkan "Belum
   dilaporkan".
2. Alur perintah: tombol → dialog konfirmasi (nama aktuator, perintah, durasi) → `POST` →
   **202 berarti hanya "terkirim ke broker"**. Tampilkan status perintah `SENT` ("menunggu
   konfirmasi perangkat") dan ikuti event `ACTUATOR_COMMAND_UPDATED` dengan `commandUid` yang sama
   sampai `EXECUTED` (✓) atau `FAILED` (✕ + `errorMessage`). Bila tidak ada konfirmasi dalam ±30
   detik, tampilkan peringatan "belum ada konfirmasi dari perangkat" — jangan anggap berhasil.
3. **Perintah ON memakai durasi**: kirim `{ "command": "ON", "parameters": { "durationSeconds": n } }`.
   Input durasi (detik, bilangan bulat > 0) tampil untuk setiap perintah ON; **wajib** bila
   `maxRunSeconds` tidak null dan dibatasi ≤ `maxRunSeconds`. Backend juga mewajibkan durasi untuk
   tipe `DISTRIBUTION_PUMP`, `TROLLEY_MOTOR`, `DOSING_PUMP`, `FILL_VALVE`, `SAMPLING_PUMP` —
   daftar ini dikonfigurasi di backend dan **tidak diekspos lewat API**, jadi jangan hardcode
   sebagai satu-satunya validasi: selalu tampilkan pesan `INVALID_COMMAND` dari backend.
4. **Tombol STOP (`OFF`) selalu aktif dan menonjol**, tidak pernah dinonaktifkan oleh kondisi apa pun
   di frontend (backend tidak pernah memblokir OFF). OFF tidak perlu durasi dan cukup konfirmasi
   ringan.
5. **Interlock**: respons `409 SAFETY_INTERLOCK` punya `details.interlock`. Tampilkan dialog
   penjelasan dalam Bahasa Indonesia:
   - `BACKUP_POWER` — "Listrik PLN padam / daya cadangan: dosing, sampling, dan trolley diblokir."
   - `EXCLUSIVE_OPERATION` — "Tidak bisa berjalan bersamaan: dosing tidak boleh jalan saat trolley
     bergerak atau LED capture menyala."
   - `DEVICE_NOT_ONLINE` — "Perangkat sedang offline; perintah ditolak."
   - lainnya → tampilkan `message` mentah.
   Frontend boleh memberi **peringatan dini** (mis. banner "Mode baterai" saat ada perangkat
   `onBackupPower`), tapi keputusan akhir tetap milik backend — jangan menonaktifkan tombol ON
   berdasarkan tebakan frontend.
6. `400 INVALID_COMMAND` (aktuator disabled, durasi hilang/melebihi batas) → tampilkan `message`.
   `503 MESSAGING_ERROR` → "Broker tidak tersedia; perintah tercatat sebagai gagal."
7. Aktuator `enabled=false` → kontrol ON disembunyikan, badge "Nonaktif", tombol untuk mengaktifkan
   kembali lewat PATCH (dengan konfirmasi).
8. **Trolley**: `TROLLEY-DIR` tidak boleh dibalik saat motor jalan (diurutkan oleh edge agent), dan
   kosakata arah belum disepakati. Jangan buat d-pad/joystick seperti referensi. Tampilkan
   `TROLLEY-RUN` dan `TROLLEY-DIR` sebagai aktuator biasa, plus posisi stasiun di denah.
9. Nonaktifkan tombol kirim selama request berjalan (cegah klik ganda = perintah ganda).

---

## Kualitas & struktur

- Struktur yang disarankan: `src/app` (routes), `src/components/ui` (primitif), `src/components/*`
  (kartu domain), `src/lib/api` (klien HTTP, tipe, zod, hooks query), `src/lib/realtime` (klien
  STOMP + penerapan event ke cache), `src/config/dashboard-layout.ts`, `src/lib/format.ts`
  (angka, satuan, waktu relatif WIB).
- Setiap kartu punya state **loading (skeleton)**, **kosong**, dan **error** yang bergaya sama.
- Aksesibilitas: tombol ikon punya `aria-label`, kontras cukup, status tidak hanya dikomunikasikan
  lewat warna (titik status + teks).
- PWA: manifest, ikon, theme color hijau; **jangan cache respons API** di service worker (data
  kendali harus selalu segar) — cukup cache aset statis.
- Test: unit test untuk formatter, penerapan event realtime ke cache, dan pemetaan error
  interlock; satu test komponen untuk dialog perintah aktuator.

## Menjalankan backend untuk pengembangan

```bash
# di repo backend
docker compose up -d postgres           # atau PostgreSQL lokal
SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run      # Windows: mvnw.cmd
```

Profil `dev` tanpa broker dan hardware: 5 perangkat katalog dibuat otomatis, simulator mengirim
telemetri & heartbeat tiap 10 dtk, perintah aktuator diterima transport mock. Login dev:
`operator` / `dev-operator-password`. Endpoint bantu **khusus dev** (jangan dipakai di UI produksi;
boleh dibuat halaman "Dev Tools" tersembunyi yang hanya muncul bila `system.mode === 'DEVELOPMENT'`):

```
POST /api/dev/devices/JETSON-01/status        {"powerSource": "BATTERY"}          # simulasi PLN padam
POST /api/dev/devices/PANEL-01/status         {"actuators": {"TROLLEY-RUN": "ON"}} # trolley jalan
POST /api/dev/devices/PANEL-01/alerts         {"type":"SSR_SHORT","severity":"CRITICAL","actuatorCode":"DIST-PUMP"}
POST /api/dev/devices/JETSON-01/ai-detections {"detectionType":"NUTRIENT_DEFICIENCY","stationCode":"ST-03",
                                               "scores":{"Leaf_N_stress":0.71,"Leaf_P_stress":0.12,"Leaf_K_stress":0.64}}
POST /api/dev/devices/{deviceCode}/command-ack {"commandUid":"<uid>","success":true,"actuatorState":"ON"}
GET  /api/dev/outbox                           # perintah yang "akan" dikirim ke broker (ambil commandUid)
```

Gunakan ini untuk memverifikasi seluruh alur: perintah → `SENT` → ack → `EXECUTED`, interlock 409,
banner daya cadangan, alert baru, deteksi AI baru — semuanya harus muncul di UI secara realtime
tanpa reload.

## Yang belum ada di backend (jangan dipalsukan)

Catat di `docs/backend-gaps.md` dan tampilkan secara jujur di UI:

- Tidak ada refresh token (sesi 60 menit).
- Tidak ada endpoint yang menyajikan berkas gambar AI.
- Konfigurasi interlock (timed types, grup eksklusif) tidak diekspos lewat API.
- Tidak ada ambang agronomi/rentang ideal, tidak ada skor "kesehatan tanaman", tidak ada data
  cuaca luar, tidak ada task/jadwal, tidak ada siklus tanam (HST).
- Tidak ada perintah "ambil foto"/capture trolley dan tidak ada stream kamera live (CCTV).
- Tidak ada event realtime untuk alert yang di-acknowledge atau perubahan data master
  (rename/enable sensor/aktuator) — refetch setelah mutasi sendiri.

## Urutan pengerjaan

1. Setup proyek, design token (warna, radius, tipografi, dark mode), layout shell (rail, header,
   bottom nav) — tunjukkan screenshot dulu sebelum lanjut.
2. Klien API + auth + halaman login.
3. Dashboard dari `/api/dashboard/overview` (statis dulu).
4. Realtime STOMP.
5. Kontrol aktuator dengan semua aturan keselamatan.
6. Halaman detail sensor + grafik riwayat, alert, AI, perangkat.
7. PWA, dark mode, polishing, test.

Setelah tiap tahap, jalankan terhadap backend profil `dev` dan verifikasi di browser sebelum
melapor selesai.
