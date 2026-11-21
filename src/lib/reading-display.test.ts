import { describe, expect, it } from "vitest";
import { describeReading, isUnreadEc } from "./reading-display";

const num = (value: number) => ({ value, textValue: null });

describe("describeReading", () => {
  it("pelampung: 1 → Air cukup, 0 → Air rendah, teks CLOSED dianggap cukup", () => {
    expect(describeReading("tank.float_low_ok", num(1))).toEqual({ kind: "text", text: "Air cukup", tone: "ok" });
    expect(describeReading("tank.float_low_ok", num(0))).toEqual({ kind: "text", text: "Air rendah", tone: "danger" });
    expect(describeReading("tank.float_low_ok", { value: null, textValue: "closed" })).toMatchObject({ text: "Air cukup" });
  });

  it("pelampung tanpa bacaan → bukan teks (tetap '—' di layar)", () => {
    expect(describeReading("tank.float_low_ok", null)).toEqual({ kind: "value", text: null });
  });

  it("EC 0 → Belum terbaca dengan petunjuk; EC bernilai tetap angka", () => {
    expect(describeReading("tank.ec", num(0))).toMatchObject({ kind: "unread", text: "Belum terbaca" });
    expect(describeReading("tank.ec", num(1.82))).toEqual({ kind: "value", text: "1,82" });
  });

  it("metrik lain tidak diubah, termasuk nilai 0 (mis. cahaya 0 lux di malam hari)", () => {
    expect(describeReading("light.illuminance", num(0))).toEqual({ kind: "value", text: "0" });
    expect(describeReading("soil_a.ec", num(0))).toEqual({ kind: "value", text: "0" });
  });
});

describe("isUnreadEc", () => {
  it("hanya bacaan ≤ 0 yang dianggap belum terbaca", () => {
    expect(isUnreadEc(num(0))).toBe(true);
    expect(isUnreadEc(num(0.4))).toBe(false);
    expect(isUnreadEc(null)).toBe(false);
    expect(isUnreadEc({ value: null, textValue: null })).toBe(false);
  });
});
