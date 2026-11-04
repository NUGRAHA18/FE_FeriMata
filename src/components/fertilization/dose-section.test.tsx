import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "@/lib/api/client";
import { doseErrorMessage, doseSummary, mlSummary, parseMl } from "@/lib/fertilization";
import type { FertilizationRun } from "@/lib/api/types";
import { json, renderWithProviders, signIn } from "@/test/utils";
import { DoseSection } from "./dose-section";

const pumps = [
  { nutrient: "N", actuatorCode: "DOSING-N", available: true, flowMlPerSecond: 2, maxMl: 300 },
  { nutrient: "P", actuatorCode: "DOSING-P", available: true, flowMlPerSecond: null, maxMl: null },
  { nutrient: "K", actuatorCode: "DOSING-K", available: true, flowMlPerSecond: 2, maxMl: 300 },
];
const aiDose = { mode: "AI", nitrogenMl: null, phosphorusMl: null, potassiumMl: null, updatedAt: null, updatedBy: null, pumps };

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn((_url: string, init?: RequestInit) => {
    if (init?.method === "PUT") return json(200, { ...aiDose, ...JSON.parse(String(init.body)), updatedBy: "operator" });
    return json(200, aiDose);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const lastPut = () => {
  const puts = fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT");
  return JSON.parse(String(puts.at(-1)?.[1]?.body));
};

describe("Takaran pupuk", () => {
  it("bawaan AI; operator mengisi ml sendiri, pompa yang belum ditakar hanya boleh 0", async () => {
    signIn();
    const { user } = renderWithProviders(<DoseSection />);
    expect(await screen.findByText("Otomatis (AI)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ubah takaran" }));
    await user.click(screen.getByRole("radio", { name: "Atur sendiri" }));
    await user.type(screen.getByRole("textbox", { name: "Nitrogen (N)" }), "50");
    await user.type(screen.getByRole("textbox", { name: "Fosfor (P)" }), "10");
    await user.type(screen.getByRole("textbox", { name: "Kalium (K)" }), "12,5");
    await user.click(screen.getByRole("button", { name: "Simpan takaran" }));
    expect(await screen.findByText("Pompa ini belum ditakar debitnya. Isi 0, atau takar dulu.")).toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: "Fosfor (P)" }));
    await user.click(screen.getByRole("button", { name: "Simpan takaran" }));
    await waitFor(() => expect(lastPut()).toEqual({ mode: "MANUAL", nitrogenMl: 50, phosphorusMl: 0, potassiumMl: 12.5 }));
    expect(await screen.findByText("Atur sendiri")).toBeInTheDocument();
    expect(screen.getByText("N 50 ml · P 0 ml · K 12,5 ml")).toBeInTheDocument();
  });

  it("lebih dari batas pompa ditolak sebelum dikirim", async () => {
    signIn();
    const { user } = renderWithProviders(<DoseSection />);
    await user.click(await screen.findByRole("button", { name: "Ubah takaran" }));
    await user.click(screen.getByRole("radio", { name: "Atur sendiri" }));
    await user.type(screen.getByRole("textbox", { name: "Nitrogen (N)" }), "301");
    await user.click(screen.getByRole("button", { name: "Simpan takaran" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Nitrogen (N)" })).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByRole("textbox", { name: "Nitrogen (N)" })).toHaveAccessibleDescription("Paling banyak 300 ml sekali pupuk.");
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);
  });
});

describe("helper takaran", () => {
  const conflict = (details: Record<string, unknown>) =>
    new ApiRequestError({ status: 409, code: "BUSINESS_RULE_VIOLATION", message: "x", details, path: "/fertilization/dose" });

  it("isian ml: kosong = 0, koma boleh, bukan angka ditolak", () => {
    expect(parseMl("")).toEqual({ ok: true, value: 0 });
    expect(parseMl("12,5")).toEqual({ ok: true, value: 12.5 });
    expect(parseMl("abc").ok).toBe(false);
    expect(parseMl("10001").ok).toBe(false);
  });

  it("409 dari backend jadi kalimat petani", () => {
    expect(doseErrorMessage(conflict({ reason: "TOO_MUCH", nutrient: "K", maxMl: 300 }))).toBe("Terlalu banyak. Pompa Kalium (K) paling banyak 300 ml sekali pupuk.");
    expect(doseErrorMessage(conflict({ reason: "PUMP_NOT_CALIBRATED", nutrient: "P" }))).toMatch(/Fosfor \(P\) belum ditakar/);
    expect(doseErrorMessage(conflict({ reason: "DOSE_ZERO" }))).toMatch(/semuanya 0/);
  });

  it("riwayat: takaran Anda dalam ml, takaran AI dalam detik", () => {
    expect(mlSummary(50, 0, null)).toBe("N 50 ml · P 0 ml");
    const base = { nitrogenSeconds: 25, phosphorusSeconds: 0, potassiumSeconds: 6 } as FertilizationRun;
    expect(doseSummary({ ...base, doseSource: "MANUAL", manualNitrogenMl: 50, manualPhosphorusMl: 0, manualPotassiumMl: 12 })).toBe(
      "N 50 ml · P 0 ml · K 12 ml (takaran Anda)",
    );
    expect(doseSummary({ ...base, doseSource: "AI" })).toMatch(/^N 25 dtk/);
  });
});
