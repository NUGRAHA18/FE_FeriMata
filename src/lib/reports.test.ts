import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Plant, PlantObservation } from "@/lib/api/types";
import { json, reading, signIn, t } from "@/test/utils";
import { csvCell, csvTime, toCsv } from "./csv";
import { exportObservations, exportSensorHistory, HISTORY_EXPORT_LIMIT } from "./reports";

const lines = (csv: string) => csv.replace(/^﻿/, "").trimEnd().split("\r\n");

describe("CSV", () => {
  it("meng-escape koma, kutip, dan baris baru", () => {
    expect(csvCell('daun "kuning", layu')).toBe('"daun ""kuning"", layu"');
    expect(csvCell("baris\nbaru")).toBe('"baris\nbaru"');
    expect(csvCell(1.25)).toBe("1.25");
    expect(csvCell(null)).toBe("");
    expect(csvCell(Number.NaN)).toBe("");
  });

  it("menetralkan teks yang bisa dibaca sebagai rumus, tapi tidak angka negatif", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-daun gugur")).toBe("'-daun gugur");
    expect(csvCell(-3.5)).toBe("-3.5");
  });

  it("diawali BOM, header, baris CRLF", () => {
    const csv = toCsv([{ a: 1 }, { a: 2 }], [{ header: "a", value: (r) => r.a }]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(lines(csv)).toEqual(["a", "1", "2"]);
  });

  it("waktu ditulis dalam WIB", () => {
    expect(csvTime("2026-09-19T07:00:05Z")).toBe("2026-09-19 14:00:05");
    expect(csvTime("bukan tanggal")).toBe("");
  });
});

describe("ekspor laporan", () => {
  beforeEach(() => signIn());
  afterEach(() => vi.unstubAllGlobals());

  it("riwayat sensor: semua halaman, urut waktu naik", async () => {
    const page = (p: number) => ({
      content: p === 0 ? [reading(7, 3, 3), reading(7, 2, 2)] : [reading(7, 1, 1)],
      page: p, size: 1000, totalElements: 3, totalPages: 2, last: p === 1,
    });
    const fetch = vi.fn((url: string) => json(200, page(Number(new URL(url, "http://x").searchParams.get("page")))));
    vi.stubGlobal("fetch", fetch);

    const r = await exportSensorHistory(7, "24h");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(r.rows).toBe(3);
    expect(r.truncated).toBe(false);
    const out = lines(r.csv);
    expect(out[0]).toBe("waktu_wib,nilai,satuan,kode_sensor,metric_key,kode_alat,diterima_wib");
    expect(out.slice(1).map((l) => l.split(",")[1])).toEqual(["1", "2", "3"]);
  });

  it("riwayat sensor: berhenti di batas ekspor dan menandai terpotong", async () => {
    const total = HISTORY_EXPORT_LIMIT * 2;
    const fetch = vi.fn(() => json(200, { content: [reading(7, 1, 1)], page: 0, size: 1000, totalElements: total, totalPages: total / 1000, last: false }));
    vi.stubGlobal("fetch", fetch);
    const r = await exportSensorHistory(7, "7d");
    expect(fetch).toHaveBeenCalledTimes(HISTORY_EXPORT_LIMIT / 1000);
    expect(r.truncated).toBe(true);
  });

  it("pengamatan: satu baris per catatan, kolom tanah dari snapshot", async () => {
    const plant = (id: number, code: string, active = true): Plant => ({
      id, code, name: code, description: null, cycleId: 5, cycleCode: "MT-1", treatmentCode: "N-", blockCode: "B1", rowCode: null, plotCode: "A",
      stationCode: null, positionInRow: null, comparisonGroup: "FERTIMATA", taggedLeaves: null, active, metadata: null, lastObservation: null,
      createdAt: t(0), updatedAt: t(0),
    });
    const obs = (plantId: number, sec: number, extra: Partial<PlantObservation> = {}): PlantObservation => ({
      id: plantId * 10 + sec, plantId, plantCode: `P${plantId}`, observedAt: t(sec), hst: 20, heightCm: 30.5, leafCount: 8, leaf3LengthCm: null,
      leaf3WidthCm: null, visualNotes: null, soilSnapshot: null, observedBy: "operator", createdAt: t(sec), ...extra,
    });
    const pageOf = (content: PlantObservation[]) => ({ content, page: 0, size: 200, totalElements: content.length, totalPages: 1, last: true });

    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/plants/2/observations")) return json(200, pageOf([obs(2, 1, { visualNotes: "tepi daun kuning, keriting", soilSnapshot: { "soil.a.moisture": { value: 41.2, unit: "%" } } })]));
        if (url.includes("/plants/1/observations")) return json(200, pageOf([obs(1, 9), obs(1, 2)]));
        return json(200, [plant(2, "B1-N-02", false), plant(1, "B1-N-01")]);
      }),
    );

    const r = await exportObservations(5);
    expect(r.rows).toBe(3);
    const out = lines(r.csv);
    expect(out[0]).toContain("tanah_soil_a_moisture (%)");
    expect(out[1]).toMatch(/^MT-1,B1-N-01,N-,B1,/);
    expect(out[1]).toContain("14:00:02");
    expect(out[2]).toContain("14:00:09");
    expect(out[3]).toContain('"tepi daun kuning, keriting"');
    expect(out[3]).toMatch(/,41\.2$/);
    expect(out[3]).toContain(",tidak,"); // tanaman nonaktif tetap ikut
  });
});
