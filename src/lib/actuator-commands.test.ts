import { describe, expect, it } from "vitest";
import { ApiRequestError } from "@/lib/api/client";
import { commandSpecsFor, commandSummary, isRetiredActuator, isSequenceActuator, validateStation } from "./actuator-commands";
import { describeCommandError, describeCommandFailure, reportedStateLabel, splitFailureMessage } from "./actuator-safety";

const cmds = (a: Parameters<typeof commandSpecsFor>[0]) => commandSpecsFor(a).map((s) => s.command);

describe("commandSpecsFor — aktuator virtual (BE-1)", () => {
  it("relay biasa tetap ON/OFF", () => {
    expect(cmds({ type: "DOSING_PUMP", supportedCommands: ["ON", "OFF"] })).toEqual(["ON", "OFF"]);
    expect(cmds({ type: null })).toEqual(["ON", "OFF"]);
  });
  it("patroli dan pindah stasiun; berhenti selalu terakhir", () => {
    expect(cmds({ type: "TROLLEY_PATROL", supportedCommands: ["START", "STOP"] })).toEqual(["START", "STOP"]);
    expect(cmds({ type: "TROLLEY_POSITION", supportedCommands: ["HOME", "GOTO_STATION", "STOP"] })).toEqual(["GOTO_STATION", "HOME", "STOP"]);
    expect(commandSpecsFor({ type: "TROLLEY_PATROL" }).find((s) => s.command === "STOP")?.stop).toBe(true);
  });
  it("campur pupuk otomatis milik layanan tim AI: aktuator lamanya disembunyikan", () => {
    expect(isRetiredActuator({ type: "DOSING_LOOP" })).toBe(true);
    expect(isRetiredActuator({ type: "DOSING_PUMP" })).toBe(false);
    expect(isRetiredActuator({ type: null })).toBe(false);
  });
  it("mengikuti supportedCommands bila backend mempersempit", () => {
    expect(cmds({ type: "TROLLEY_POSITION", supportedCommands: ["HOME", "STOP"] })).toEqual(["HOME", "STOP"]);
  });
  it("tipe virtual baru → tombol mentah dari supportedCommands", () => {
    const a = { type: "LED_STRIP", supportedCommands: ["STOP", "BLINK"] };
    expect(isSequenceActuator(a)).toBe(true);
    expect(cmds(a)).toEqual(["BLINK", "STOP"]);
  });
});

describe("isian perintah", () => {
  it("stasiun 1..10", () => {
    expect(validateStation("3")).toEqual({ ok: true, value: 3 });
    expect(validateStation("0").ok).toBe(false);
    expect(validateStation("11").ok).toBe(false);
    expect(validateStation("").ok).toBe(false);
  });
  it("ringkasan perintah untuk riwayat", () => {
    expect(commandSummary("GOTO_STATION", { station: 4 })).toBe("Pindah ke stasiun 4");
    expect(commandSummary("START", null)).toBe("Mulai patroli");
  });
  it("status aktuator berurutan", () => {
    expect(reportedStateLabel("ON", true)).toBe("Sedang berjalan");
    expect(reportedStateLabel("ON")).toBe("Menyala");
  });
});

describe("alasan gagal dari alat (BE-7)", () => {
  it("memakai failureCode backend", () => {
    const f = describeCommandFailure({ failureCode: "INTERLOCK_POWER", errorMessage: "INTERLOCK_POWER: listrik PLN padam" });
    expect(f).toMatchObject({ code: "INTERLOCK_POWER", detail: "listrik PLN padam" });
    expect(f?.message).toMatch(/^Listrik PLN padam/);
  });
  it("backend lama tanpa failureCode: kode diambil dari awalan pesan", () => {
    expect(describeCommandFailure({ errorMessage: "BUSY: patroli sedang berjalan" })?.code).toBe("BUSY");
  });
  it("kode tak dikenal → teks dari alat", () => {
    expect(describeCommandFailure({ failureCode: "PUMP_JAM", errorMessage: "PUMP_JAM: pompa macet" })).toEqual({ code: "PUMP_JAM", message: "pompa macet", detail: null });
  });
  it("tanpa pesan → null", () => {
    expect(describeCommandFailure({ failureCode: null, errorMessage: null })).toBeNull();
    expect(splitFailureMessage("Device reported failure")).toEqual({ code: null, text: "Device reported failure" });
  });
  it("penolakan kosakata backend dijelaskan per isian", () => {
    const err = new ApiRequestError({ status: 400, code: "INVALID_COMMAND", message: "x", details: { parameter: "targetEc", min: 0.5, max: 4 }, path: "/" });
    expect(describeCommandError(err).message).toBe("Target EC harus 0,5 sampai 4 mS/cm.");
  });
});
