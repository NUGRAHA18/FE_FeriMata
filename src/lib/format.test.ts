import { describe, expect, it } from "vitest";
import {
  alertTypeLabel,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatReading,
  formatRelative,
  formatTime,
  formatUnit,
  powerSourceLabel,
  stationCode,
} from "./format";

describe("formatUnit", () => {
  it("memetakan satuan backend ke bentuk tampilan", () => {
    expect(formatUnit("C")).toBe("°C");
    expect(formatUnit("uS/cm")).toBe("µS/cm");
    expect(formatUnit("%RH")).toBe("%RH");
    expect(formatUnit("mS/cm")).toBe("mS/cm");
    expect(formatUnit(null)).toBe("");
  });
});

describe("formatNumber / formatReading", () => {
  it("memakai format id-ID dengan desimal sesuai besaran", () => {
    expect(formatNumber(28.44)).toBe("28,4");
    expect(formatNumber(6.123)).toBe("6,12");
    expect(formatNumber(1242.7)).toBe("1.243");
    expect(formatNumber(null)).toBeNull();
    expect(formatNumber(Number.NaN)).toBeNull();
  });
  it("jatuh ke textValue bila value null", () => {
    expect(formatReading({ value: null, textValue: "OPEN" })).toBe("OPEN");
    expect(formatReading({ value: null, textValue: null })).toBeNull();
    expect(formatReading(undefined)).toBeNull();
  });
});

describe("waktu", () => {
  const now = Date.parse("2026-09-19T07:00:00Z");
  it("waktu relatif dalam Bahasa Indonesia", () => {
    expect(formatRelative("2026-09-19T06:59:58Z", now)).toBe("baru saja");
    expect(formatRelative("2026-09-19T06:59:48Z", now)).toBe("12 dtk lalu");
    expect(formatRelative("2026-09-19T06:55:00Z", now)).toBe("5 mnt lalu");
    expect(formatRelative("2026-09-19T04:00:00Z", now)).toBe("3 jam lalu");
    expect(formatRelative("2026-09-17T07:00:00Z", now)).toBe("2 hari lalu");
    expect(formatRelative(null, now)).toBe("—");
  });
  it("menampilkan UTC dalam WIB (UTC+7)", () => {
    expect(formatTime("2026-09-19T07:05:00Z")).toBe("14.05");
    expect(formatDateTime("2026-09-19T07:05:09Z")).toMatch(/19 Sep 2026.*14\.05\.09 WIB$/);
  });
  it("durasi", () => {
    expect(formatDuration(40)).toBe("40 dtk");
    expect(formatDuration(120)).toBe("2 mnt");
    expect(formatDuration(125)).toBe("2 mnt 5 dtk");
    expect(formatDuration(3 * 3600 + 600)).toBe("3 jam 10 mnt");
  });
});

describe("label domain", () => {
  it("sumber daya", () => {
    expect(powerSourceLabel("MAINS")).toBe("PLN");
    expect(powerSourceLabel("BATTERY")).toBe("Baterai");
    expect(powerSourceLabel("SOLAR")).toBe("SOLAR");
    expect(powerSourceLabel(null)).toBe("Tidak diketahui");
  });
  it("tipe alert dikenal diterjemahkan, lainnya mentah", () => {
    expect(alertTypeLabel("DEVICE_OFFLINE")).toBe("Perangkat offline");
    expect(alertTypeLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });
  it("kode stasiun trolley", () => {
    expect(stationCode(0)).toBe("HOME");
    expect(stationCode(3)).toBe("ST-03");
    expect(stationCode(12)).toBe("ST-12");
  });
});
