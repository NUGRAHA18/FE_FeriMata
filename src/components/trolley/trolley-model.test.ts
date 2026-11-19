import { describe, expect, it } from "vitest";
import { deriveStatus, END_X_M, estimatedX, HOME_X_M, initialStopWatch, inputsFrom, nextStopWatch, stationX, STATION_PITCH_M, stopTarget, stopWatchFlags } from "./trolley-model";

const idle = { station: 4, homeLimit: 0, endLimit: 0, run: "OFF", dir: "OFF", pan: "OFF", patrol: "OFF", goto: "OFF" };

describe("geometri rel (model tim hardware Rev. A)", () => {
  it("stasiun 1 di 300 mm, tiap 600 mm, stasiun 10 di 5.700 mm; 0 = HOME", () => {
    expect(stationX(1)).toBeCloseTo(0.3);
    expect(stationX(2)).toBeCloseTo(0.9);
    expect(stationX(10)).toBeCloseTo(5.7);
    expect(stationX(0)).toBe(HOME_X_M);
    expect(stationX(12)).toBeCloseTo(5.7);
  });
});

describe("status kereta", () => {
  it("diam di stasiun", () => {
    const s = deriveStatus(inputsFrom(idle));
    expect(s).toMatchObject({ station: 4, moving: false, busy: null, pan: "timur", limitFault: false, headline: "Di stasiun 4" });
  });

  it("HOME aktif atau stasiun 0 = posisi awal", () => {
    expect(deriveStatus(inputsFrom({ ...idle, station: 0 })).headline).toBe("Di posisi awal (ujung selatan)");
    expect(deriveStatus(inputsFrom({ ...idle, station: null, homeLimit: 1 })).headline).toBe("Di posisi awal (ujung selatan)");
  });

  it("patroli, pindah stasiun, dan relay mentah dihitung bergerak; arah dari R3 (ON = utara)", () => {
    expect(deriveStatus(inputsFrom({ ...idle, patrol: "ON" }))).toMatchObject({ busy: "patrol", moving: true });
    expect(deriveStatus(inputsFrom({ ...idle, goto: "ON", dir: "ON" }))).toMatchObject({ busy: "goto", direction: "utara", headline: "Sedang bergerak ke utara" });
    expect(deriveStatus(inputsFrom({ ...idle, run: "ON", dir: "OFF" }))).toMatchObject({ busy: "manual", direction: "selatan" });
  });

  it("HOME dan END aktif bersamaan = kabel limit putus, didahulukan dari status lain", () => {
    const s = deriveStatus(inputsFrom({ ...idle, homeLimit: 1, endLimit: 1, patrol: "ON" }));
    expect(s.limitFault).toBe(true);
    expect(s.headline).toBe("Sensor ujung rel bermasalah");
  });

  it("posisi belum dilaporkan", () => {
    const s = deriveStatus(inputsFrom({ ...idle, station: null, homeLimit: null, endLimit: null }));
    expect(s.station).toBeNull();
    expect(s.headline).toBe("Posisi belum dilaporkan");
  });

  it("CAMERA-PAN ON = barat; belum dilaporkan = null", () => {
    expect(deriveStatus(inputsFrom({ ...idle, pan: "ON" })).pan).toBe("barat");
    expect(deriveStatus(inputsFrom({ ...idle, pan: null })).pan).toBeNull();
  });
});

describe("perkiraan posisi di gambar", () => {
  it("diam = tepat di stasiun yang dilaporkan", () => {
    expect(estimatedX({ station: 3, moving: false, direction: null }, 10)).toBeCloseTo(stationX(3));
  });

  it("bergerak = maju sesuai kecepatan, paling jauh satu jarak stasiun", () => {
    expect(estimatedX({ station: 3, moving: true, direction: "utara" }, 1)).toBeCloseTo(stationX(3) + 0.153);
    expect(estimatedX({ station: 3, moving: true, direction: "utara" }, 600)).toBeCloseTo(stationX(3) + STATION_PITCH_M);
    expect(estimatedX({ station: 3, moving: true, direction: "selatan" }, 1)).toBeCloseTo(stationX(3) - 0.153);
  });

  it("tidak melewati ujung rel", () => {
    expect(estimatedX({ station: 0, moving: true, direction: "selatan" }, 5)).toBe(HOME_X_M);
    expect(estimatedX({ station: 10, moving: true, direction: "utara" }, 5)).toBeLessThanOrEqual(END_X_M);
  });

  it("posisi belum diketahui = tidak digambar", () => {
    expect(estimatedX({ station: null, moving: true, direction: "utara" }, 5)).toBeNull();
  });
});

describe("tombol Hentikan", () => {
  it("ke patroli bila patroli jalan, selain itu ke TROLLEY-GOTO", () => {
    expect(stopTarget({ busy: "patrol" })).toBe("patrol");
    expect(stopTarget({ busy: "goto" })).toBe("goto");
    expect(stopTarget({ busy: "manual" })).toBe("goto");
    expect(stopTarget({ busy: null })).toBe("goto");
  });
});

describe("berhenti di antara stasiun (pengamat di browser)", () => {
  const T0 = 1_000_000;
  it("bergerak lalu berhenti tanpa laporan posisi baru = posisi basi; laporan baru = pasti lagi", () => {
    let w = nextStopWatch(initialStopWatch, { moving: true, runOn: true, now: T0, stationMark: "a" });
    expect(w.runSince).toBe(T0);
    w = nextStopWatch(w, { moving: false, runOn: false, now: T0 + 5000, stationMark: "a" });
    expect(stopWatchFlags(w, T0 + 6000)).toEqual({ positionStale: true, settling: true });
    expect(stopWatchFlags(w, T0 + 30_000)).toEqual({ positionStale: true, settling: false });
    expect(deriveStatus(inputsFrom({ ...idle, ...stopWatchFlags(w, T0 + 6000) })).headline).toBe("Baru berhenti, menunggu laporan posisi");
    const s = deriveStatus(inputsFrom({ ...idle, ...stopWatchFlags(w, T0 + 30_000) }));
    expect(s.headline).toBe("Berhenti di antara stasiun");
    expect(s.positionStale).toBe(true);
    w = nextStopWatch(w, { moving: false, runOn: false, now: T0 + 31_000, stationMark: "b" });
    expect(stopWatchFlags(w, T0 + 31_000).positionStale).toBe(false);
  });

  it("tanpa pernah terlihat bergerak tidak dianggap basi; state tidak berubah = objek yang sama", () => {
    const w = nextStopWatch(initialStopWatch, { moving: false, runOn: false, now: T0, stationMark: "a" });
    expect(w).toBe(initialStopWatch);
    expect(stopWatchFlags(w, T0).positionStale).toBe(false);
  });

  it("patroli berhenti memotret: motor mati = perkiraan gerak berhenti, patroli tetap dihitung bergerak", () => {
    let w = nextStopWatch(initialStopWatch, { moving: true, runOn: true, now: T0, stationMark: null });
    w = nextStopWatch(w, { moving: true, runOn: false, now: T0 + 4000, stationMark: null });
    expect(w.runSince).toBeNull();
    expect(w.wasMoving).toBe(true);
    expect(stopWatchFlags(w, T0 + 4000).positionStale).toBe(false);
  });

  it("HOME/END aktif didahulukan dari posisi basi", () => {
    expect(deriveStatus(inputsFrom({ ...idle, homeLimit: 1, positionStale: true })).headline).toBe("Di posisi awal (ujung selatan)");
  });
});
