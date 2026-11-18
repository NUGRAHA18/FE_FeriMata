import { trolleyLayout } from "@/config/dashboard-layout";

/* Geometri rel dan status kereta kamera. Angka dari model 3D tim hardware (Rev. A, 21 Okt 2026) dan
 * config edge (`trolley.first_station_mm`, `station_pitch_mm`); dalam meter, x = selatan (HOME) → utara. */

export const RAIL_LENGTH_M = 6;
/** Limit HOME tertekan di x 73,6 mm; END di 5.856,4 mm. */
export const HOME_X_M = 0.0736;
export const END_X_M = 5.8564;
export const FIRST_STATION_M = 0.3;
export const STATION_PITCH_M = trolleyLayout.stationSpacingCm / 100;
/** Kecepatan motor ±153 mm/s (JGB37 12 V, roda 65 mm). Dipakai untuk perkiraan gerak di antara laporan. */
export const SPEED_M_S = 0.153;

/** Posisi x (m) stasiun 1–10; 0 atau kurang = HOME. */
export function stationX(n: number): number {
  if (n <= 0) return HOME_X_M;
  const last = trolleyLayout.stationCount;
  return FIRST_STATION_M + (Math.min(n, last) - 1) * STATION_PITCH_M;
}

export type Direction = "utara" | "selatan";
export type Busy = "patrol" | "goto" | "manual" | null;

export type TrolleyInputs = {
  /** `trolley.station` terakhir: 0 = HOME, 1–10. Edge hanya mengirimnya saat kereta berhenti di stasiun. */
  station: number | null;
  homeActive: boolean | null;
  endActive: boolean | null;
  /** Status dilaporkan relay TROLLEY-RUN (R2), TROLLEY-DIR (R3, ON = utara), CAMERA-PAN (R1, ON = barat). */
  runOn: boolean | null;
  dirNorth: boolean | null;
  panWest: boolean | null;
  patrolOn: boolean;
  gotoOn: boolean;
  /** Kereta pernah bergerak setelah laporan posisi terakhir: posisi itu basi. `settling` = baru saja
   * berhenti, laporan posisi (dikirim edge beberapa detik setelah tiba) mungkin masih di jalan. */
  positionStale: boolean;
  settling: boolean;
};

/** Edge mengirim `trolley.station` beberapa detik setelah kereta tiba; sebelum batas ini tunggu dulu. */
export const POSITION_GRACE_MS = 15_000;

export type TrolleyStatus = {
  station: number | null;
  moving: boolean;
  busy: Busy;
  direction: Direction | null;
  pan: "timur" | "barat" | null;
  /** HOME dan END aktif bersamaan: kontak NC, jadi hampir pasti kabel limit putus (edge mengunci kereta). */
  limitFault: boolean;
  headline: string;
  detail: string | null;
  /** Posisi terakhir mungkin tidak lagi benar (berhenti di antara stasiun). */
  positionStale: boolean;
};

/** Pengamat transisi di browser. Backend memperbarui `stateUpdatedAt` di setiap laporan rutin walau
 * status tidak berubah, jadi waktunya tidak bisa dipakai; jam browser saja yang dipakai di sini.
 * - `stoppedAt`: kereta berhenti setelah terlihat bergerak; `stationMark` = recordedAt posisi saat itu.
 *   Laporan posisi baru (mark berbeda) = posisi kembali pasti.
 * - `runSince`: relay jalan (R2) terlihat menyala sejak kapan, untuk perkiraan gerak di gambar. */
export type StopWatch = { wasMoving: boolean; stoppedAt: number | null; stationMark: string | null; runSince: number | null };

export const initialStopWatch: StopWatch = { wasMoving: false, stoppedAt: null, stationMark: null, runSince: null };

export function nextStopWatch(prev: StopWatch, s: { moving: boolean; runOn: boolean; now: number; stationMark: string | null }): StopWatch {
  let next = prev;
  if (s.moving) {
    if (!prev.wasMoving || prev.stoppedAt !== null) next = { ...next, wasMoving: true, stoppedAt: null, stationMark: null };
  } else if (prev.wasMoving) {
    next = { ...next, wasMoving: false, stoppedAt: s.now, stationMark: s.stationMark };
  } else if (prev.stoppedAt !== null && s.stationMark !== prev.stationMark) {
    next = { ...next, stoppedAt: null, stationMark: null };
  }
  if (s.runOn && next.runSince === null && s.now > 0) next = { ...next, runSince: s.now };
  else if (!s.runOn && next.runSince !== null) next = { ...next, runSince: null };
  return next;
}

export function stopWatchFlags(w: StopWatch, now: number): { positionStale: boolean; settling: boolean } {
  if (w.stoppedAt === null) return { positionStale: false, settling: false };
  return { positionStale: true, settling: now - w.stoppedAt < POSITION_GRACE_MS };
}

const on = (s: string | null | undefined): boolean | null => (s == null ? null : s.toUpperCase() === "ON");

/** Nilai sensor 0/1 → boolean; selain itu null. */
export function flag(value: number | null | undefined): boolean | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value >= 0.5;
}

export function inputsFrom(args: {
  station: number | null | undefined;
  homeLimit: number | null | undefined;
  endLimit: number | null | undefined;
  run?: string | null;
  dir?: string | null;
  pan?: string | null;
  patrol?: string | null;
  goto?: string | null;
  /** Dari `useStopWatch`: kereta berhenti setelah terlihat bergerak dan belum ada laporan posisi baru. */
  positionStale?: boolean;
  settling?: boolean;
}): TrolleyInputs {
  const st = args.station;
  const stale = args.positionStale === true;
  const settling = stale && args.settling === true;
  return {
    station: st != null && Number.isFinite(st) ? Math.max(0, Math.min(trolleyLayout.stationCount, Math.round(st))) : null,
    homeActive: flag(args.homeLimit),
    endActive: flag(args.endLimit),
    runOn: on(args.run),
    dirNorth: on(args.dir),
    panWest: on(args.pan),
    patrolOn: on(args.patrol) === true,
    gotoOn: on(args.goto) === true,
    positionStale: stale,
    settling,
  };
}

export function deriveStatus(i: TrolleyInputs): TrolleyStatus {
  const busy: Busy = i.patrolOn ? "patrol" : i.gotoOn ? "goto" : i.runOn ? "manual" : null;
  const moving = busy !== null;
  const direction: Direction | null = i.dirNorth == null ? null : i.dirNorth ? "utara" : "selatan";
  const pan = i.panWest == null ? null : i.panWest ? "barat" : "timur";
  const limitFault = i.homeActive === true && i.endActive === true;

  let headline: string;
  let detail: string | null = null;
  if (limitFault) {
    headline = "Sensor ujung rel bermasalah";
    detail = "Sensor ujung selatan dan utara aktif bersamaan, kemungkinan kabelnya putus. Kereta dikunci sampai diperiksa teknisi.";
  } else if (busy === "patrol") {
    headline = "Sedang patroli memotret tanaman";
    detail = i.station != null && i.station > 0 ? `Terakhir berhenti di stasiun ${i.station}.` : null;
  } else if (moving) {
    headline = direction ? `Sedang bergerak ke ${direction}` : "Sedang bergerak";
    detail = "Posisi di gambar adalah perkiraan sampai kereta berhenti di stasiun.";
  } else if (i.homeActive === true) {
    headline = "Di posisi awal (ujung selatan)";
  } else if (i.endActive === true) {
    headline = "Di ujung utara rel";
  } else if (i.positionStale && i.settling) {
    headline = "Baru berhenti, menunggu laporan posisi";
  } else if (i.positionStale) {
    headline = "Berhenti di antara stasiun";
    detail = "Kereta dihentikan sebelum sampai stasiun, jadi posisinya tidak pasti. Pilih stasiun atau tekan Kembali ke awal.";
  } else if (i.station === 0) {
    headline = "Di posisi awal (ujung selatan)";
  } else if (i.station != null) {
    headline = `Di stasiun ${i.station}`;
  } else {
    headline = "Posisi belum dilaporkan";
    detail = "Perangkat belum mengirim posisi kereta. Tekan Kembali ke awal agar posisinya diketahui lagi.";
  }
  return { station: i.station, moving, busy, direction, pan, limitFault, headline, detail, positionStale: !moving && i.positionStale };
}

/** Posisi yang digambar (m): posisi terakhir yang dilaporkan, ditambah perkiraan gerak selama berjalan,
 * dibatasi satu jarak stasiun dan ujung rel supaya laporan yang terlambat tidak membuat kereta "kabur". */
export function estimatedX(status: Pick<TrolleyStatus, "station" | "moving" | "direction">, movingForS: number): number | null {
  const base = status.station == null ? null : stationX(status.station);
  if (base == null) return null;
  if (!status.moving || !status.direction || movingForS <= 0) return base;
  const sign = status.direction === "utara" ? 1 : -1;
  const travel = Math.min(SPEED_M_S * movingForS, STATION_PITCH_M);
  return Math.min(END_X_M, Math.max(HOME_X_M, base + sign * travel));
}

/** Perintah Hentikan dikirim ke patroli bila patroli jalan; selain itu ke TROLLEY-GOTO, yang menghentikan
 * gerak kereta apa pun di edge (termasuk relay mentah). */
export function stopTarget(status: Pick<TrolleyStatus, "busy">): "patrol" | "goto" {
  return status.busy === "patrol" ? "patrol" : "goto";
}
