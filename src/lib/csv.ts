import { siteConfig } from "@/config/site";

/* CSV RFC 4180 (Fase 3.7): koma, titik desimal, CRLF, BOM UTF-8 untuk Excel. Waktu
 * "YYYY-MM-DD HH:mm:ss" WIB agar dikenali sebagai tanggal oleh Excel/Sheets/pandas. */

export type CsvValue = string | number | boolean | null | undefined;
export type CsvColumn<T> = { header: string; value: (row: T) => CsvValue };

// Teks bebas dari pengguna (catatan pengamatan) yang diawali = + - @ bisa dieksekusi sebagai rumus.
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(v: CsvValue): string {
  if (v == null) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  if (typeof v === "boolean") return v ? "ya" : "tidak";
  const s = FORMULA_START.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((c) => csvCell(c.header)).join(",")];
  for (const r of rows) lines.push(columns.map((c) => csvCell(c.value(r))).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

const stampFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: siteConfig.timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** "2026-10-22 14:05:09" pada zona waktu situs (WIB). */
export function csvTime(v: string | number | Date | null | undefined): string {
  if (v == null) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const p = Object.fromEntries(stampFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

/** Nama berkas aman: huruf kecil, tanpa spasi, diakhiri tanggal hari ini. */
export function csvFilename(...parts: string[]): string {
  const slug = parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug}-${csvTime(Date.now()).slice(0, 10)}.csv`;
}

export function downloadCsv(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
