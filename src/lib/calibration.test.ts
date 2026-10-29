import { describe, expect, it } from "vitest";
import { ApiRequestError } from "@/lib/api/client";
import { calibrationErrorMessage, formatEquation, nowLocalInput, pumpFlow } from "./calibration";

const rule = (message: string) => new ApiRequestError({ status: 409, code: "BUSINESS_RULE_VIOLATION", message, path: "/x" });

describe("calibrationErrorMessage", () => {
  it("menerjemahkan aturan backend yang sering ditemui", () => {
    expect(calibrationErrorMessage(rule("Sensor S1 has no reading in the PT15M before that time; enter sensorValue by hand"))).toMatch(/Isi angka sensor secara manual/);
    expect(calibrationErrorMessage(rule("At least 3 trials are required (Protokol §8); 2 given"))).toBe("Perlu paling sedikit 3 kali ulangan.");
  });

  it("pesan lain ditampilkan apa adanya", () => {
    expect(calibrationErrorMessage(rule("Something else"))).toBe("Something else");
  });
});

describe("formatEquation", () => {
  it("menulis model linear dengan kovariat, koefisien negatif sebagai minus", () => {
    expect(formatEquation({ intercept: 3.2, slope: 0.84, covariates: { "soil.a.temperature": -0.05 } })).toBe(
      "terkoreksi = 3,2 + 0,84 × mentah − 0,05 × soil.a.temperature",
    );
  });
});

describe("pumpFlow", () => {
  it("debit = total volume / total waktu; ulangan kosong diabaikan", () => {
    expect(pumpFlow([{ durationSeconds: 30, volumeMl: 60 }, { durationSeconds: 30, volumeMl: 63 }, { durationSeconds: 0, volumeMl: 0 }])).toEqual({ count: 2, flowMlPerSecond: 2.05 });
  });
});

describe("nowLocalInput", () => {
  it("format datetime-local", () => {
    expect(nowLocalInput(new Date(2026, 9, 29, 9, 5))).toBe("2026-10-29T09:05");
  });
});
