import { describe, expect, it } from "vitest";
import { ApiRequestError } from "@/lib/api/client";
import { buildCommand, commandStatusText, describeCommandError, describeCommandFailure, isNoResponse, reportedStateLabel, validateDuration } from "./actuator-safety";

const apiErr = (status: number, code: string, message: string, details?: Record<string, unknown>) =>
  new ApiRequestError({ status, code, message, details, path: "/actuators/1/commands" });

describe("describeCommandError — interlock", () => {
  it("BACKUP_POWER", () => {
    const v = describeCommandError(apiErr(409, "SAFETY_INTERLOCK", "blocked", { interlock: "BACKUP_POWER" }));
    expect(v.kind).toBe("interlock");
    expect(v.message).toMatch(/^Listrik PLN padam dan sistem memakai baterai/);
  });
  it("EXCLUSIVE_OPERATION", () => {
    const v = describeCommandError(apiErr(409, "SAFETY_INTERLOCK", "x", { interlock: "EXCLUSIVE_OPERATION" }));
    expect(v.message).toMatch(/^Tidak bisa berjalan bersamaan/);
  });
  it("DEVICE_NOT_ONLINE", () => {
    expect(describeCommandError(apiErr(409, "SAFETY_INTERLOCK", "x", { interlock: "DEVICE_NOT_ONLINE" })).message).toBe("Alat sedang terputus, perintah tidak bisa dikirim.");
  });
  it("interlock tak dikenal → pesan mentah backend", () => {
    const v = describeCommandError(apiErr(409, "SAFETY_INTERLOCK", "Tank level low", { interlock: "TANK_LOW" }));
    expect(v).toMatchObject({ kind: "interlock", interlock: "TANK_LOW", message: "Tank level low" });
  });
  it("INVALID_COMMAND & MESSAGING_ERROR", () => {
    expect(describeCommandError(apiErr(400, "INVALID_COMMAND", "durationSeconds wajib")).message).toBe("durationSeconds wajib");
    expect(describeCommandError(apiErr(503, "MESSAGING_ERROR", "x")).message).toMatch(/dicatat sebagai gagal/);
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

describe("perintah tanpa jawaban (NO_RESPONSE)", () => {
  it("dikenali dari failureCode, bukan teks; labelnya 'Alat tidak menjawab'", () => {
    const cmd = { status: "FAILED", failureCode: "NO_RESPONSE", errorMessage: "teks apa pun" };
    expect(isNoResponse(cmd)).toBe(true);
    expect(commandStatusText(cmd, { FAILED: "Gagal" })).toBe("Alat tidak menjawab");
    expect(describeCommandFailure(cmd)?.message).toMatch(/tidak menjawab dalam 2 menit/);
    expect(isNoResponse({ status: "EXECUTED", failureCode: null })).toBe(false);
    expect(commandStatusText({ status: "FAILED", failureCode: "BUSY" }, { FAILED: "Gagal" })).toBe("Gagal");
  });
});
