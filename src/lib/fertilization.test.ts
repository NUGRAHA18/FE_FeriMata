import { describe, expect, it } from "vitest";
import { ApiRequestError } from "@/lib/api/client";
import type { FertilizationRun, FertilizationSchedule } from "@/lib/api/types";
import { alertBody, alertHeadline } from "@/lib/format";
import { lastRunView } from "@/lib/irrigation";
import {
  activeStageIndex,
  agoLabel,
  aiTimestamp,
  doseSummary,
  dueLabel,
  fertilizationErrorMessage,
  formatFarmDate,
  parseInterval,
  runView,
  scheduleState,
} from "./fertilization";

// 2 Nov 2026 10:00 WIB = 03:00 UTC.
const now = Date.parse("2026-11-02T03:00:00Z");

const run = (over: Partial<FertilizationRun> = {}): FertilizationRun => ({
  id: 1,
  runDate: "2026-11-02",
  irrigationScheduleId: 3,
  status: "DONE",
  step: null,
  reasonCode: null,
  message: null,
  intervalDays: 7,
  aiNitrogenSeconds: 12.4,
  aiPhosphorusSeconds: 8,
  aiPotassiumSeconds: 20,
  nitrogenSeconds: 12,
  phosphorusSeconds: 8,
  potassiumSeconds: 20,
  stirrerSeconds: 120,
  stirrerCommandUid: null,
  nitrogenCommandUid: null,
  phosphorusCommandUid: null,
  potassiumCommandUid: null,
  startedAt: null,
  finishedAt: null,
  createdAt: null,
  ...over,
});

const schedule = (over: Partial<FertilizationSchedule> = {}): FertilizationSchedule => ({
  enabled: true,
  aiConfigured: true,
  aiReachable: true,
  aiError: null,
  aiScheduleId: 1,
  intervalDays: 7,
  lastFertilizedDate: null,
  lastFertilizedAt: null,
  nextDueDate: "2026-11-02",
  activeRun: null,
  ...over,
});

describe("tanggal kebun", () => {
  it("jatuh tempo: hari ini / besok / dalam N hari; tanggal lewat = hari ini", () => {
    expect(dueLabel("2026-11-02", now)).toBe("hari ini");
    expect(dueLabel("2026-10-30", now)).toBe("hari ini");
    expect(dueLabel("2026-11-03", now)).toBe("besok");
    expect(dueLabel("2026-11-09", now)).toMatch(/^dalam 7 hari \(9 Nov 2026\)$/);
    expect(dueLabel(null, now)).toBeNull();
  });

  it("terakhir dipupuk", () => {
    expect(agoLabel("2026-11-02", now)).toBe("hari ini");
    expect(agoLabel("2026-11-01", now)).toBe("kemarin");
    expect(agoLabel("2026-10-26", now)).toMatch(/^7 hari lalu \(26 Okt 2026\)$/);
  });

  it("hari WIB, bukan UTC: 2 Nov 23:30 WIB masih tanggal 2", () => {
    expect(dueLabel("2026-11-03", Date.parse("2026-11-02T16:30:00Z"))).toBe("besok");
    expect(formatFarmDate("2026-11-02")).toBe("2 Nov 2026");
  });
});

describe("runView", () => {
  it("selesai, termasuk AI menilai tidak perlu pupuk (normal)", () => {
    expect(runView(run())).toEqual({ tone: "ok", text: "Sudah dipupuk", detail: null });
    expect(runView(run({ reasonCode: "AI_NO_DOSE_NEEDED" }))).toMatchObject({ tone: "ok", text: "Tidak perlu pupuk" });
    expect(runView(run({ reasonCode: "AI_CAPPED" })).detail).toMatch(/dipotong/);
  });

  it("dilewati dan gagal: alasan dari kode, dicoba lagi pada jam siram berikutnya", () => {
    const s = runView(run({ status: "SKIPPED", reasonCode: "AI_INPUTS_NOT_READY" }));
    expect(s.tone).toBe("warn");
    expect(s.text).toBe("Belum dipupuk: data sensor tanah belum ada atau sudah lama");
    expect(s.detail).toBe("Dicoba lagi pada jam siram berikutnya.");
    const f = runView(run({ status: "FAILED", reasonCode: "INTERLOCK_FLOAT" }));
    expect(f.tone).toBe("danger");
    expect(f.text).toBe("Gagal memupuk: air drum pupuk rendah");
    expect(f.detail).toMatch(/^Air di drum pupuk rendah.*Dicoba lagi/);
    const np = runView(run({ status: "SKIPPED", reasonCode: "AI_NO_PHOTO" }));
    expect(np.text).toBe("Belum dipupuk: belum ada foto daun dari kamera 3 hari terakhir");
    expect(np.detail).toMatch(/kereta kamera.*Dicoba lagi pada jam siram berikutnya\.$/);
    expect(runView(run({ status: "FAILED", reasonCode: "SOMETHING_NEW" })).text).toBe("Gagal memupuk: alasan lain (lihat Info teknis)");
  });

  it("sebagian: tidak diulang supaya tidak dobel", () => {
    const p = runView(run({ status: "PARTIAL", reasonCode: "NO_ACK" }));
    expect(p.tone).toBe("warn");
    expect(p.text).toBe("Dipupuk sebagian: alat tidak menjawab perintah");
    expect(p.detail).toMatch(/Tidak diulang/);
  });

  it("berjalan: langkah sekarang dari `step` (null = N)", () => {
    expect(runView(run({ status: "IN_PROGRESS" })).detail).toMatch(/pompa Nitrogen \(N\)/);
    expect(runView(run({ status: "IN_PROGRESS", step: "MIXING" })).detail).toMatch(/diaduk/);
    expect(activeStageIndex(null)).toBe(0);
    expect(activeStageIndex("POTASSIUM")).toBe(2);
    expect(activeStageIndex("IRRIGATE")).toBe(4);
    expect(activeStageIndex("UNKNOWN")).toBe(0);
  });

  it("ringkasan takaran", () => {
    expect(doseSummary(run())).toBe("N 12 dtk · P 8 dtk · K 20 dtk");
    expect(doseSummary(run({ phosphorusSeconds: null, potassiumSeconds: null }))).toBe("N 12 dtk");
    expect(doseSummary(run({ nitrogenSeconds: null, phosphorusSeconds: null, potassiumSeconds: null }))).toBeNull();
  });
});

describe("scheduleState", () => {
  it("urutan keadaan kartu", () => {
    expect(scheduleState(schedule({ enabled: false, aiReachable: false }))).toEqual({ kind: "disabled" });
    expect(scheduleState(schedule({ aiConfigured: false, aiReachable: false }))).toEqual({ kind: "ai-not-configured" });
    expect(scheduleState(schedule({ aiReachable: false, intervalDays: null }))).toEqual({ kind: "ai-unreachable" });
    expect(scheduleState(schedule({ intervalDays: null }))).toEqual({ kind: "no-schedule" });
    expect(scheduleState(schedule())).toEqual({ kind: "active", intervalDays: 7 });
  });
});

describe("isian jarak hari", () => {
  it("1–60 hari, angka bulat", () => {
    expect(parseInterval(" 7 ")).toEqual({ ok: true, value: 7 });
    expect(parseInterval("0")).toMatchObject({ ok: false });
    expect(parseInterval("61")).toMatchObject({ ok: false });
    expect(parseInterval("3,5")).toMatchObject({ ok: false });
    expect(parseInterval("")).toMatchObject({ ok: false });
  });

  it("502 AI & 400 jadi kalimat petani", () => {
    const ai = new ApiRequestError({ status: 502, code: "AI_SERVICE_ERROR", message: "Connection refused", path: "/fertilization/schedule" });
    expect(fertilizationErrorMessage(ai)).toMatch(/^Layanan AI tidak menjawab/);
    const bad = new ApiRequestError({ status: 400, code: "VALIDATION_ERROR", message: "x", path: "/fertilization/schedule" });
    expect(fertilizationErrorMessage(bad)).toBe("Jarak pemupukan harus 1 sampai 60 hari.");
  });
});

describe("waktu dari layanan AI", () => {
  it("tanpa zona = WIB", () => {
    expect(aiTimestamp("2026-11-02T06:00:00.123")).toBe("2026-11-02T06:00:00.123+07:00");
    expect(aiTimestamp("2026-11-02T06:00:00Z")).toBe("2026-11-02T06:00:00Z");
    expect(aiTimestamp("2026-11-02T06:00:00+07:00")).toBe("2026-11-02T06:00:00+07:00");
    expect(aiTimestamp(null)).toBeNull();
  });
});

describe("jadwal siram menunggu pemupukan", () => {
  it("WAITING dan FERTILIZATION_IN_PROGRESS bukan masalah", () => {
    expect(lastRunView("WAITING", "FERTILIZING")).toMatchObject({ tone: "info", text: "Menunggu pemupukan selesai" });
    expect(lastRunView("SKIPPED", "FERTILIZATION_IN_PROGRESS")).toMatchObject({ tone: "neutral", text: "Dilewati: pemupukan sedang berjalan" });
  });
});

describe("peringatan pemupukan", () => {
  it("judul & isi dari tipe + reasonCode", () => {
    expect(alertHeadline("FERTILIZATION_SKIPPED", "Fertilization skipped")).toBe("Pemupukan hari ini belum berjalan");
    expect(alertHeadline("FERTILIZATION_PARTIAL", "x")).toBe("Pemupukan hanya sebagian");
    expect(alertBody("English", { type: "FERTILIZATION_SKIPPED", metadata: { reasonCode: "AI_UNAVAILABLE" } })).toBe(
      "Pupuk yang dijadwalkan hari ini belum dituang: layanan AI tidak menjawab. Dicoba lagi pada jam siram berikutnya.",
    );
    expect(alertBody("English", { type: "FERTILIZATION_PARTIAL", metadata: { reasonCode: "DEVICE_REFUSED" } })).toMatch(/^Sebagian pompa pupuk sudah menuang lalu berhenti: alat menolak perintah\./);
    expect(alertBody("English", { type: "IRRIGATION_SKIPPED", metadata: { reasonCode: "FERTILIZATION_IN_PROGRESS", time: "06:00" } })).toMatch(/^Penyiraman jam 06:00 dilewati karena pemupukan sedang berjalan/);
  });
});
