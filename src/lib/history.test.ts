import { describe, expect, it } from "vitest";
import { intervalLabel, toPoints } from "./history";

const at = (h: number) => new Date(Date.UTC(2026, 9, 1, h)).toISOString();
const pt = (h: number, avg: number) => ({ bucketStart: at(h), count: 60, min: avg - 1, avg, max: avg + 1 });

describe("toPoints (riwayat agregat)", () => {
  it("mengurutkan naik dan membentuk pita min–max", () => {
    const out = toPoints({ intervalSeconds: 3600, points: [pt(1, 20), pt(0, 18)] });
    expect(out.map((p) => p.avg)).toEqual([18, 20]);
    expect(out[0].band).toEqual([17, 19]);
  });

  it("menyisipkan titik null di celah (alat mati) supaya garis putus", () => {
    const out = toPoints({ intervalSeconds: 3600, points: [pt(0, 18), pt(1, 19), pt(5, 22)] });
    expect(out).toHaveLength(4);
    expect(out[2]).toMatchObject({ t: Date.parse(at(2)), avg: null, band: null });
    expect(out[3].avg).toBe(22);
  });
});

describe("intervalLabel", () => {
  it("menerjemahkan label interval backend", () => {
    expect(intervalLabel("15m")).toBe("15 menit");
    expect(intervalLabel("3h")).toBe("3 jam");
    expect(intervalLabel("1d")).toBe("1 hari");
    expect(intervalLabel("7d")).toBe("1 minggu");
  });
});
