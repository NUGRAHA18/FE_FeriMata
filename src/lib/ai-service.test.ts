import { describe, expect, it } from "vitest";
import { aiStatusView, deficiencyRows, diseaseLabels, fertilizationDecision, irrigationDecision, MAX_PHOTO_BYTES, validatePhotos } from "./ai-service";

describe("status layanan AI", () => {
  it("belum diatur / tidak menjawab / tersambung", () => {
    const base = { message: null, latencyMs: null, checkedAt: "2026-11-02T03:00:00Z" };
    expect(aiStatusView(undefined).tone).toBe("neutral");
    expect(aiStatusView(undefined, true).text).toBe("Status AI tidak diketahui");
    expect(aiStatusView({ ...base, configured: false, reachable: false }).text).toBe("AI belum disambungkan");
    expect(aiStatusView({ ...base, configured: true, reachable: false }).text).toBe("AI tidak menjawab");
    expect(aiStatusView({ ...base, configured: true, reachable: true, latencyMs: 40 })).toEqual({ tone: "ok", text: "AI tersambung" });
  });
});

describe("foto yang diunggah", () => {
  const photo = (name: string, size = 1000, type = "image/jpeg") => ({ name, size, type });
  it("paling banyak 10, paling besar 10 MB, harus gambar", () => {
    expect(validatePhotos([photo("a.jpg")])).toBeNull();
    expect(validatePhotos(Array.from({ length: 11 }, (_, i) => photo(`${i}.jpg`)))).toMatch(/Paling banyak 10/);
    expect(validatePhotos([photo("besar.jpg", MAX_PHOTO_BYTES + 1)])).toMatch(/besar\.jpg terlalu besar/);
    expect(validatePhotos([photo("x.pdf", 10, "application/pdf")])).toMatch(/bukan foto/);
  });
});

describe("hasil deteksi", () => {
  it("kekurangan nutrisi: persen per kelas, terbesar dulu", () => {
    expect(deficiencyRows({ Leaf_N_stress: 20, Leaf_K_stress: 70, Leaf_P_stress: 10, junk: "x" })).toEqual([
      ["Leaf_K_stress", 70],
      ["Leaf_N_stress", 20],
      ["Leaf_P_stress", 10],
    ]);
    expect(deficiencyRows(["x"])).toEqual([]);
    expect(deficiencyRows(null)).toEqual([]);
  });

  it("penyakit: label unik", () => {
    expect(diseaseLabels(["Downy_mildew", "Downy_mildew", "", 3])).toEqual(["Downy_mildew"]);
    expect(diseaseLabels({})).toEqual([]);
  });
});

describe("riwayat AI (snake_case)", () => {
  it("siram & pupuk; waktu tanpa zona dianggap WIB", () => {
    expect(irrigationDecision({ run_at: "2026-11-02T06:00:00", watering_duration: 48.7, hst: 30, data_sensor: { ec_water: 1.2 } })).toEqual({
      at: "2026-11-02T06:00:00+07:00",
      seconds: 48.7,
      hst: 30,
      input: { ec_water: 1.2 },
    });
    expect(fertilizationDecision({ run_at: "2026-11-02T05:50:00", nitrogen_duration: 12.5, phosfor_duration: 3, kalium_duration: 0, data_input: null })).toEqual({
      at: "2026-11-02T05:50:00+07:00",
      n: 12.5,
      p: 3,
      k: 0,
      input: null,
    });
  });
});
