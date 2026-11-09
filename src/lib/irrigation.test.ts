import { describe, expect, it } from "vitest";
import { ApiRequestError } from "@/lib/api/client";
import { groupRunsByDay, irrigationErrorMessage, irrigationRunView, isIrrigationRunPending, lastRunView, nextRunLabel, runDayLabel, scheduleLastRun } from "./irrigation";

// 29 Okt 2026 10:00 WIB = 03:00 UTC.
const now = Date.parse("2026-10-29T03:00:00Z");
const conflict = (details: Record<string, unknown>) =>
  new ApiRequestError({ status: 409, code: "BUSINESS_RULE_VIOLATION", message: "x", details, path: "/irrigation/schedules" });

describe("nextRunLabel", () => {
  it("hari ini / besok / tanggal, dalam WIB", () => {
    expect(nextRunLabel("2026-10-29T10:30:00Z", now)).toBe("hari ini 17:30");
    expect(nextRunLabel("2026-10-29T23:00:00Z", now)).toBe("besok 06:00"); // 30 Okt 06:00 WIB
    expect(nextRunLabel("2026-10-31T23:00:00Z", now)).toMatch(/1 Nov 2026 06:00$/);
    expect(nextRunLabel(null, now)).toBeNull();
  });
});

describe("lastRunView", () => {
  it("hasil terakhir dari kode, bukan dari pesan bahasa Inggris", () => {
    expect(lastRunView("STARTED", null)).toEqual({ tone: "ok", text: "Disiram", detail: null });
    const skipped = lastRunView("SKIPPED", "BACKUP_POWER")!;
    expect(skipped.text).toBe("Dibatalkan demi keamanan: listrik PLN padam, memakai baterai");
    expect(skipped.detail).toMatch(/^Listrik PLN padam dan sistem memakai baterai/);
    expect(lastRunView("SKIPPED", "FLOAT_LOW")?.text).toBe("Dibatalkan demi keamanan: air drum rendah");
    expect(lastRunView("FAILED", "PUMP_UNAVAILABLE")?.text).toBe("Gagal: pompa siram tidak ditemukan atau dimatikan");
    expect(lastRunView("FAILED", "MESSAGING_ERROR")?.text).toBe("Gagal: perintah tidak sampai ke pompa siram");
    expect(lastRunView("FAILED", "DATABASE_ERROR")?.text).toBe("Gagal: alasan lain (lihat Detail sistem)");
    expect(lastRunView("MISSED", "BACKEND_DOWN")?.text).toBe("Terlewat (sistem mati)");
    expect(lastRunView(null, null)).toBeNull();
  });

  it("lama siram terakhir = detik yang dikirim ke pompa", () => {
    expect(lastRunView("STARTED", null, 85)).toEqual({ tone: "ok", text: "Disiram 1 mnt 25 dtk", detail: null });
    expect(lastRunView("STARTED", null)).toEqual({ tone: "ok", text: "Disiram", detail: null });
  });

  it("data lama: AI menilai tidak perlu siram tetap hasil normal, bukan pembatalan", () => {
    const v = lastRunView("SKIPPED", "AI_NO_WATER_NEEDED")!;
    expect(v.tone).toBe("ok");
    expect(v.text).toBe("Tidak perlu siram");
  });
});

describe("riwayat siram", () => {
  const run = (over: Partial<Parameters<typeof irrigationRunView>[0]>) =>
    irrigationRunView({ result: "STARTED", reasonCode: null, durationSeconds: 300, commandStatus: null, commandFailureCode: null, ...over });

  it("STARTED baru berarti disiram bila perangkat menjawab EXECUTED (atau data lama tanpa status)", () => {
    expect(run({ commandStatus: "EXECUTED" })).toEqual({ tone: "ok", text: "Disiram 5 mnt", detail: null });
    expect(run({ commandStatus: null }).text).toBe("Disiram 5 mnt");
    expect(run({ commandStatus: "SENT" })).toEqual({ tone: "info", text: "Perintah siram terkirim, menunggu jawaban perangkat", detail: null });
  });

  it("STARTED + FAILED: perintah terkirim tapi perangkat gagal, alasan dari kode perangkat", () => {
    const fault = run({ commandStatus: "FAILED", commandFailureCode: "OUTPUT_FAULT" });
    expect(fault.tone).toBe("danger");
    expect(fault.text).toBe("Gagal: perangkat tidak menjalankan perintah siram");
    expect(fault.detail).toMatch(/Saklar perangkat ini bermasalah/);
    expect(run({ commandStatus: "FAILED", commandFailureCode: "KODE_BARU" }).detail).toBe("Alasannya ada di Detail sistem.");
    // Tidak ada jawaban = keadaan pompa tidak diketahui, bukan pasti gagal.
    const silent = run({ commandStatus: "FAILED", commandFailureCode: "NO_RESPONSE" });
    expect(silent.tone).toBe("warn");
    expect(silent.text).toBe("Perangkat tidak menjawab perintah siram");
    const float = run({ commandStatus: "FAILED", commandFailureCode: "INTERLOCK_FLOAT" });
    expect(float.tone).toBe("warn");
    expect(float.text).toBe("Dibatalkan demi keamanan: air drum rendah");
  });

  it("hasil selain STARTED sama dengan kartu Jam siram, apa pun status perintahnya", () => {
    expect(run({ result: "SKIPPED", reasonCode: "FLOAT_LOW", durationSeconds: null }).text).toBe("Dibatalkan demi keamanan: air drum rendah");
    expect(run({ result: "MISSED", reasonCode: "BACKEND_DOWN", durationSeconds: null }).text).toBe("Terlewat (sistem mati)");
    expect(run({ result: "WAITING", reasonCode: "FERTILIZING", durationSeconds: null }).text).toBe("Menunggu pemupukan selesai");
    expect(run({ result: "FAILED", reasonCode: "PUMP_UNAVAILABLE", commandStatus: "FAILED" }).text).toBe("Gagal: pompa siram tidak ditemukan atau dimatikan");
  });

  it("kartu Jam siram memakai kalimat yang sama dari lastCommandStatus; backend lama tanpa field itu tetap 'Disiram'", () => {
    const s = {
      id: 1, time: "06:00", durationSeconds: 300, enabled: true, notes: null, nextRunAt: null, lastRunAt: null, lastResult: "STARTED",
      lastMessage: null, lastReasonCode: null, lastDurationSeconds: 300, lastCommandUid: "cmd-1",
    };
    expect(irrigationRunView(scheduleLastRun(s)!).text).toBe("Disiram 5 mnt");
    const failed = irrigationRunView(scheduleLastRun({ ...s, lastCommandStatus: "FAILED", lastCommandFailureCode: "NO_RESPONSE" })!);
    expect(failed.text).toBe("Perangkat tidak menjawab perintah siram");
    expect(scheduleLastRun({ ...s, lastResult: null })).toBeNull();
  });

  it("baris yang masih akan berubah: menunggu pemupukan atau menunggu jawaban perangkat", () => {
    expect(isIrrigationRunPending({ result: "WAITING", commandStatus: null })).toBe(true);
    expect(isIrrigationRunPending({ result: "STARTED", commandStatus: "SENT" })).toBe(true);
    expect(isIrrigationRunPending({ result: "STARTED", commandStatus: "EXECUTED" })).toBe(false);
    expect(isIrrigationRunPending({ result: "SKIPPED", commandStatus: null })).toBe(false);
  });

  it("dikelompokkan per tanggal kebun dengan judul hari ini / kemarin / tanggal", () => {
    const groups = groupRunsByDay([
      { id: 3, runDate: "2026-10-29" },
      { id: 2, runDate: "2026-10-29" },
      { id: 1, runDate: "2026-10-28" },
    ]);
    expect(groups.map((g) => [g.date, g.runs.map((r) => r.id)])).toEqual([
      ["2026-10-29", [3, 2]],
      ["2026-10-28", [1]],
    ]);
    expect(runDayLabel("2026-10-29", now)).toBe("Hari ini, 29 Okt 2026");
    expect(runDayLabel("2026-10-28", now)).toBe("Kemarin, 28 Okt 2026");
    expect(runDayLabel("2026-10-20", now)).toBe("20 Okt 2026");
  });
});

describe("pesan error", () => {
  it("409 dibaca dari details.reason", () => {
    expect(irrigationErrorMessage(conflict({ reason: "DUPLICATE_TIME", time: "06:00" }))).toBe("Jam 06:00 sudah ada di jadwal. Pilih jam lain.");
    expect(irrigationErrorMessage(conflict({ reason: "TOO_LONG", maxRunSeconds: 900 }))).toBe("Terlalu lama. Pompa siram paling lama 15 mnt sekali jalan.");
  });
});
