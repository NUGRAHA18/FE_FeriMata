import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { json, reading, signIn } from "@/test/utils";
import { csvCell, csvTime, toCsv } from "./csv";
import { countCsvRows, exportSensorHistory, HISTORY_EXPORT_LIMIT, serverCsv } from "./reports";

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
    expect(out[0]).toBe("waktu_wib,nilai,nilai_terkoreksi,satuan,kode_sensor,metric_key,kode_alat,diterima_wib");
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

  it("CSV backend: menghitung baris data dan menjamin BOM", async () => {
    expect(countCsvRows('﻿a,b\r\n1,"x\r\ny"\r\n2,z\r\n')).toBe(2);
    expect(countCsvRows("a,b\r\n")).toBe(0);
    const r = await serverCsv(Promise.resolve("a\r\n1\r\n"));
    expect(r.csv.startsWith("﻿")).toBe(true);
    expect(r.rows).toBe(1);
  });
});
