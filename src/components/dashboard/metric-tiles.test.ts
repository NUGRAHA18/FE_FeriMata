import { describe, expect, it } from "vitest";
import { ecTargetStatus, floatLowStatus } from "./metric-tiles";

describe("ecTargetStatus", () => {
  const target = { min: 1.8, max: 2.2 };
  it("membandingkan EC µS/cm dengan target mS/cm", () => {
    expect(ecTargetStatus({ value: 2000, unit: "uS/cm" }, target)?.tone).toBe("ok");
    expect(ecTargetStatus({ value: 1489, unit: "uS/cm" }, target)?.label).toBe("Terlalu encer");
    expect(ecTargetStatus({ value: 2.5, unit: "mS/cm" }, target)?.label).toBe("Terlalu pekat");
  });
  it("tidak menilai tanpa target atau satuan yang dikenal", () => {
    expect(ecTargetStatus({ value: 2000, unit: "uS/cm" }, null)).toBeNull();
    expect(ecTargetStatus({ value: 2000, unit: "uS/cm" }, { min: null, max: 2.2 })).toBeNull();
    expect(ecTargetStatus({ value: 2000, unit: "ppm" }, target)).toBeNull();
  });
});

describe("floatLowStatus", () => {
  it("1 / CLOSED → air cukup; 0 → air rendah; tanpa data → null", () => {
    expect(floatLowStatus({ value: 1, textValue: null })?.tone).toBe("ok");
    expect(floatLowStatus({ value: null, textValue: "closed" })?.tone).toBe("ok");
    expect(floatLowStatus({ value: 0, textValue: null })).toEqual({ tone: "danger", label: "Air drum rendah" });
    expect(floatLowStatus(undefined)).toBeNull();
  });
});
