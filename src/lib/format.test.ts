import { describe, expect, it } from "vitest";
import {
  alertBody,
  alertFailureCode,
  alertHeadline,
  alertMessageLabel,
  alertTitleLabel,
  alertTypeLabel,
  deviceNameLabel,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatReading,
  parseDecimal,
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
    expect(alertTypeLabel("DEVICE_OFFLINE")).toBe("Alat terputus");
    expect(alertTypeLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });
  it("kode stasiun trolley", () => {
    expect(stationCode(0)).toBe("HOME");
    expect(stationCode(3)).toBe("ST-03");
    expect(stationCode(12)).toBe("ST-12");
  });
});

describe("alertMessageLabel / alertTitleLabel / deviceNameLabel", () => {
  it("menerjemahkan pesan backend yang dikenal", () => {
    expect(alertMessageLabel("No message received from RIO-TANK-01 for more than 120 seconds")).toBe(
      "RIO-TANK-01 tidak memberi kabar selama lebih dari 2 menit. Periksa listrik dan kabel alat ini.",
    );
    expect(alertMessageLabel("Device RIO-TANK-01 started reporting again")).toBe("RIO-TANK-01 kembali memberi kabar.");
    expect(alertMessageLabel("Device JETSON reports power source MAINS again")).toBe("JETSON kembali memakai listrik PLN.");
    expect(alertMessageLabel("Device RIO-1 reported that command ON failed: Device reported failure")).toBe(
      "RIO-1 gagal menyalakan. Periksa alatnya, lalu coba lagi.",
    );
  });
  it("membiarkan pesan yang tidak dikenal", () => {
    expect(alertMessageLabel("Tangki hampir kosong")).toBe("Tangki hampir kosong");
  });
  it("menerjemahkan judul dan nama perangkat bawaan", () => {
    expect(alertTitleLabel("Device offline")).toBe("Alat terputus");
    expect(deviceNameLabel("Development edge device")).toBe("Komputer Simulasi (Dev)");
    expect(deviceNameLabel("Pompa Utama")).toBe("Pompa Utama");
    expect(deviceNameLabel(null)).toBeNull();
  });
});

describe("alertHeadline & alertBody", () => {
  it("memakai failureCode dari data, bukan teks pesan", () => {
    expect(alertHeadline("ACTUATOR_COMMAND_FAILED", "Actuator did not respond", "NO_RESPONSE")).toBe("Alat tidak menjawab perintah");
    expect(alertHeadline(null, "Actuator did not respond", "NO_RESPONSE")).toBe("Alat tidak menjawab perintah");
    expect(alertBody("Device PANEL-01 did not acknowledge command ON for DIST-PUMP", { failureCode: "NO_RESPONSE", deviceCode: "PANEL-01", actuatorCode: "DIST-PUMP" })).toBe(
      "PANEL-01 tidak menjawab perintah untuk DIST-PUMP. Perintah mungkin tidak dijalankan; periksa keadaan alat.",
    );
  });

  it("tanpa kode: label tipe, lalu terjemahan judul lama, lalu judul apa adanya", () => {
    expect(alertHeadline("ACTUATOR_COMMAND_FAILED", "Something")).toBe("Perintah gagal dijalankan");
    expect(alertHeadline(null, "Device offline")).toBe("Alat terputus");
    expect(alertHeadline("SMOKE_WARN", "SMOKE_WARN_1793032988")).toBe("SMOKE_WARN_1793032988");
    expect(alertFailureCode({ failureCode: "NO_RESPONSE", commandUid: "x" })).toBe("NO_RESPONSE");
    expect(alertFailureCode(null)).toBeNull();
    expect(alertFailureCode({ reasonCode: "AI_NO_WATER_NEEDED" })).toBe("AI_NO_WATER_NEEDED");
  });

  it("jadwal siram & AI: tidak perlu siram bukan masalah; durasi cadangan menyebut alasannya", () => {
    expect(alertHeadline("IRRIGATION_SKIPPED", "x", "AI_NO_WATER_NEEDED")).toBe("Tidak perlu siram (keputusan AI)");
    expect(alertBody("x", { type: "IRRIGATION_SKIPPED", metadata: { reasonCode: "AI_NO_WATER_NEEDED", time: "06:00" } })).toBe(
      "Penyiraman jam 06:00 tidak dijalankan: AI menilai tanah masih cukup basah. Ini normal.",
    );
    expect(alertHeadline("IRRIGATION_AI_FALLBACK", "x")).toBe("Siram memakai durasi cadangan");
    expect(alertBody("x", { type: "IRRIGATION_AI_FALLBACK", metadata: { reasonCode: "AI_UNAVAILABLE", time: "06:00" } })).toBe(
      "Siram jam 06:00 memakai durasi cadangan karena AI tidak bisa dipakai: layanan AI tidak menjawab.",
    );
  });
});

describe("parseDecimal", () => {
  it("menerima koma desimal, kosong → undefined, teks → NaN", () => {
    expect(parseDecimal("13,5")).toBe(13.5);
    expect(parseDecimal(" 1450 ")).toBe(1450);
    expect(parseDecimal("")).toBeUndefined();
    expect(parseDecimal("12a")).toBeNaN();
  });
});

describe("peringatan jadwal siram", () => {
  it("disusun dari metadata.reasonCode atau kode entri overview (teks Inggris tidak tampil)", () => {
    expect(alertHeadline("IRRIGATION_SKIPPED", "Scheduled irrigation skipped")).toBe("Penyiraman terjadwal dibatalkan");
    expect(
      alertBody("Irrigation scheduled at 06:00 did not start: Device is on backup power", {
        type: "IRRIGATION_SKIPPED",
        metadata: { scheduleId: 1, time: "06:00", result: "SKIPPED", reasonCode: "EXCLUSIVE_OPERATION", conflictingActuatorCode: "DOSING-N" },
      }),
    ).toBe("Penyiraman jam 06:00 dibatalkan demi keamanan: DOSING-N sedang berjalan. Jadwal berikutnya tetap berjalan.");
    // Entri overview: tanpa metadata, hanya alertType + kode (failureCode = reasonCode).
    expect(alertBody("Irrigation scheduled at 06:00 did not start: x", { type: "IRRIGATION_SKIPPED", failureCode: "FLOAT_LOW" })).toBe(
      "Penyiraman dibatalkan demi keamanan: air drum rendah. Jadwal berikutnya tetap berjalan.",
    );
    expect(alertBody("x", { type: "IRRIGATION_SKIPPED", failureCode: "PUMP_UNAVAILABLE" })).toBe(
      "Penyiraman gagal: pompa siram tidak ditemukan atau dimatikan. Jadwal berikutnya tetap berjalan.",
    );
  });
});
