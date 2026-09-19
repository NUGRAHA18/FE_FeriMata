import { describe, expect, it } from "vitest";
import { ApiRequestError } from "@/lib/api/client";
import { buildCommand, describeCommandError, reportedStateLabel, validateDuration } from "./actuator-safety";
import { downsample } from "./history";

const apiErr = (status: number, code: string, message: string, details?: Record<string, unknown>) =>
  new ApiRequestError({ status, code, message, details, path: "/actuators/1/commands" });

describe("describeCommandError — interlock", () => {
  it("BACKUP_POWER", () => {
    const v = describeCommandError(apiErr(409, "SAFETY_INTERLOCK", "blocked", { interlock: "BACKUP_POWER" }));
    expect(v.kind).toBe("interlock");
    expect(v.message).toBe("Listrik PLN padam / daya cadangan: dosing, sampling, dan trolley diblokir.");
  });
  it("EXCLUSIVE_OPERATION", () => {
    const v = describeCommandError(apiErr(409, "SAFETY_INTERLOCK", "x", { interlock: "EXCLUSIVE_OPERATION" }));
    expect(v.message).toMatch(/^Tidak bisa berjalan bersamaan/);
  });
  it("DEVICE_NOT_ONLINE", () => {
    expect(describeCommandError(apiErr(409, "SAFETY_INTERLOCK", "x", { interlock: "DEVICE_NOT_ONLINE" })).message).toBe("Perangkat sedang offline; perintah ditolak.");
  });
  it("interlock tak dikenal → pesan mentah backend", () => {
    const v = describeCommandError(apiErr(409, "SAFETY_INTERLOCK", "Tank level low", { interlock: "TANK_LOW" }));
    expect(v).toMatchObject({ kind: "interlock", interlock: "TANK_LOW", message: "Tank level low" });
  });
  it("INVALID_COMMAND & MESSAGING_ERROR", () => {
    expect(describeCommandError(apiErr(400, "INVALID_COMMAND", "durationSeconds wajib")).message).toBe("durationSeconds wajib");
    expect(describeCommandError(apiErr(503, "MESSAGING_ERROR", "x")).message).toBe("Broker tidak tersedia; perintah tercatat sebagai gagal.");
  });
});

describe("validateDuration", () => {
  it("wajib bila maxRunSeconds ada, dan dibatasi olehnya", () => {
    expect(validateDuration("", 120)).toMatchObject({ ok: false });
    expect(validateDuration("121", 120)).toMatchObject({ ok: false });
    expect(validateDuration("120", 120)).toEqual({ ok: true, value: 120 });
  });
  it("opsional bila tanpa batas; menolak non-bilangan bulat & ≤ 0", () => {
    expect(validateDuration("", null)).toEqual({ ok: true, value: null });
    expect(validateDuration("0", null)).toMatchObject({ ok: false });
    expect(validateDuration("1.5", null)).toMatchObject({ ok: false });
    expect(validateDuration("-3", null)).toMatchObject({ ok: false });
  });
  it("buildCommand hanya menyertakan durasi untuk ON", () => {
    expect(buildCommand("ON", 30)).toEqual({ command: "ON", parameters: { durationSeconds: 30 } });
    expect(buildCommand("OFF", 30)).toEqual({ command: "OFF" });
    expect(buildCommand("ON", null)).toEqual({ command: "ON" });
  });
  it("status null → Belum dilaporkan", () => {
    expect(reportedStateLabel(null)).toBe("Belum dilaporkan");
    expect(reportedStateLabel("on")).toBe("Menyala");
  });
});

describe("downsample riwayat", () => {
  it("membatasi jumlah titik dengan rata-rata per ember dan mempertahankan urutan", () => {
    const pts = Array.from({ length: 1000 }, (_, i) => ({ t: i * 1000, v: i }));
    const out = downsample(pts, 100);
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out[0].v).toBeCloseTo(4.5);
    expect(out.every((p, i) => i === 0 || p.t > out[i - 1].t)).toBe(true);
    expect(downsample(pts.slice(0, 10), 100)).toHaveLength(10);
  });
});
