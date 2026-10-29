import { describe, expect, it } from "vitest";
import { primaryNav, secondaryNav } from "@/components/shell/nav-items";
import { filterGlossary, filterSections, glossary, guideHref, guideSections, normalize, quickTour, sectionForPath } from "./guide-content";

describe("tautan kontekstual ikon Panduan", () => {
  it("halaman yang sedang dibuka → bagian Panduan", () => {
    expect(sectionForPath("/")).toBe("beranda");
    expect(sectionForPath("/sensors")).toBe("sensor");
    expect(sectionForPath("/sensors/12")).toBe("sensor");
    expect(sectionForPath("/actuators/7")).toBe("kontrol");
    expect(sectionForPath("/users")).toBe("pengaturan");
    expect(sectionForPath("/panduan")).toBeNull();
    expect(guideHref("/alerts")).toBe("/panduan#peringatan");
    expect(guideHref("/tidak-ada")).toBe("/panduan");
  });

  it("setiap menu punya bagian Panduan yang ada", () => {
    const ids = new Set(guideSections.map((s) => s.id));
    for (const item of [...primaryNav, ...secondaryNav]) {
      if (item.href === "/panduan") continue;
      const id = sectionForPath(item.href);
      expect(id, item.href).not.toBeNull();
      expect(ids.has(id!), item.href).toBe(true);
    }
  });

  it("id bagian unik", () => {
    expect(new Set(guideSections.map((s) => s.id)).size).toBe(guideSections.length);
  });
});

describe("pencarian Panduan", () => {
  it("cocok di judul atau isi, tanpa beda huruf besar/kecil dan tanda minus", () => {
    expect(filterSections(guideSections, "").length).toBe(guideSections.length);
    expect(filterSections(guideSections, "tandai sudah ditangani").map((s) => s.id)).toContain("peringatan");
    expect(filterSections(guideSections, "IPHONE").map((s) => s.id)).toEqual(["akun"]);
    expect(normalize("N−")).toBe("n-");
  });

  it("semua kata harus ada; tidak ada hasil → kosong", () => {
    expect(filterSections(guideSections, "pompa xyzzy")).toEqual([]);
  });

  it("istilah ikut dicari", () => {
    expect(filterGlossary(glossary, "hst").map((t) => t.term)).toEqual(["HST"]);
  });
});

describe("fakta yang tidak boleh salah", () => {
  // Ikon (komponen React) tidak ikut JSON.stringify.
  const all = normalize(JSON.stringify(guideSections));

  it("dua tahap perintah dan tombol Matikan tidak pernah ditolak", () => {
    expect(all).toContain(normalize("Terkirim, menunggu jawaban alat"));
    expect(all).toContain("dijalankan");
    expect(all).toContain("tidak pernah ditolak");
  });

  it("tidak menjanjikan jadwal pupuk/campur pupuk otomatis (milik layanan tim AI)", () => {
    expect(all).not.toMatch(/jadwal pupuk|campur pupuk otomatis/);
  });

  it("langkah terakhir petunjuk singkat menautkan ke Panduan", () => {
    expect(quickTour.at(-1)?.link?.href).toBe("/panduan");
  });
});
