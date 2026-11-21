import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { allVisualGuides } from "./guide-visual";

// Gambar dan posisi nomor dihasilkan skrip (npm run panduan:shots); teks ada di guide-visual.ts. Tes ini menangkap
// salah satunya ketinggalan: nomor tanpa teks, teks tanpa nomor, atau gambar belum dibuat.

describe("panduan bergambar", () => {
  for (const guide of allVisualGuides) {
    describe(guide.slug, () => {
      const spots = guide.parts.flatMap((p) => p.spots);

      it("tiap nomor di gambar punya penjelasan, dan tiap penjelasan punya nomor tepat satu kali", () => {
        const ids = spots.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) expect(guide.items[id], `penjelasan untuk "${id}"`).toBeDefined();
        expect(Object.keys(guide.items).sort()).toEqual([...ids].sort());
      });

      it("nomor berurutan 1..N dari atas ke bawah di seluruh potongan", () => {
        expect(spots.map((s) => s.n)).toEqual(spots.map((_, i) => i + 1));
      });

      it("berkas gambar ada dan kotak nomor berada di dalam gambar", () => {
        for (const p of guide.parts) {
          expect(existsSync(join(process.cwd(), "public", p.image)), p.image).toBe(true);
          for (const s of p.spots) {
            expect(s.x).toBeGreaterThanOrEqual(0);
            expect(s.y).toBeGreaterThanOrEqual(0);
            expect(s.x + s.w).toBeLessThanOrEqual(100.5);
            expect(s.y + s.h).toBeLessThanOrEqual(100.5);
          }
        }
      });

      it("id sama dengan aturan pembuat gambar (scripts/panduan/pages.mjs)", async () => {
        const { pages } = (await import("../../scripts/panduan/pages.mjs")) as { pages: { slug: string; spots: { id: string }[] }[] };
        const page = pages.find((p) => p.slug === guide.slug);
        expect(page, "halaman di pages.mjs").toBeDefined();
        expect(page!.spots.map((s) => s.id)).toEqual(spots.map((s) => s.id));
      });
    });
  }
});
