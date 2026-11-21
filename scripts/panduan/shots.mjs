// Membuat tangkapan layar Panduan bergambar (tampilan HP) dari aplikasi yang sedang berjalan, dengan data
// contoh (demo-data.mjs) menggantikan API dan WebSocket. Hasil: public/panduan/<slug>-<n>.jpg dan
// src/lib/guide-visual/<slug>.generated.json (posisi nomor, dalam persen).
//
// Pakai build produksi supaya tidak ada tombol dev Next di gambar:
//   npm run build && npm start            (terminal 1)
//   npm run panduan:shots                  (terminal 2; --base http://localhost:3000 bawaan)
// Pertama kali: npx playwright install chromium

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { buildDemo } from "./demo-data.mjs";
import { pages } from "./pages.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const base = arg("--base", "http://localhost:3000");
const only = arg("--only", null);
const WIDTH = 390;
const SCALE = 2;

/** Dijalankan di browser: kotak (px halaman) dari satu aturan pencarian, atau null bila tidak ketemu. */
function locate(spec) {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
  };
  const union = (boxes) => {
    const b = boxes.filter(Boolean);
    if (!b.length) return null;
    const x1 = Math.min(...b.map((v) => v.x));
    const y1 = Math.min(...b.map((v) => v.y));
    const x2 = Math.max(...b.map((v) => v.x + v.w));
    const y2 = Math.max(...b.map((v) => v.y + v.h));
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  };
  const leafMatching = (test) => {
    const all = [...document.querySelectorAll("body *")].filter((el) => visible(el) && el.children.length === 0);
    return all.find((el) => test(el.textContent.trim().replace(/\s+/g, " ")));
  };
  const boxed = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const r = n.getBoundingClientRect();
      if (r.width < 140 || r.height < 56) continue;
      const cs = getComputedStyle(n);
      const hasBg = !/rgba?\(\s*0,\s*0,\s*0,\s*0\)|transparent/.test(cs.backgroundColor);
      if (cs.boxShadow !== "none" || parseFloat(cs.borderTopWidth) > 0 || hasBg) return n;
    }
    return el;
  };
  const card = (el) => el && (el.closest('[class*="rounded-card"]') || el.closest("section") || el);
  const run = (s) => {
    if (s.union) return union(s.union.map(run));
    if (s.selector) {
      const el = [...document.querySelectorAll(s.selector)].find(visible);
      return el ? box(el) : null;
    }
    if (s.h2) {
      const h = [...document.querySelectorAll("h2")].find((e) => visible(e) && e.textContent.trim() === s.h2);
      return h ? box(h.closest("section") || card(h)) : null;
    }
    if (s.regex) {
      const re = new RegExp(s.regex, "i");
      const el = leafMatching((t) => re.test(t));
      return el ? box(el.closest("button, a, div") || el) : null;
    }
    if (s.text) {
      const want = s.text.toLowerCase();
      const el = leafMatching((t) => t.toLowerCase() === want);
      if (!el) return null;
      return s.text === "AKSI MANUAL" ? box(el.closest("p, div") || el) : box(boxed(el));
    }
    return null;
  };
  return run(spec);
}

async function main() {
  const demo = buildDemo();
  // sowingDate/hst mengikuti tanggal pembuatan supaya "Hari sejak semai" cocok dengan tanggal di layar.
  const sow = new Date(Date.now() - 23 * 86_400_000).toISOString().slice(0, 10);
  Object.assign(demo.overview.cultivation, { sowingDate: sow, transplantDate: sow, hst: 23 });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 844 }, deviceScaleFactor: SCALE, locale: "id-ID", isMobile: true, hasTouch: true, colorScheme: "light" });
  const far = new Date(Date.now() + 7 * 86_400_000).toISOString();
  await ctx.addInitScript(
    ([session]) => {
      try {
        localStorage.setItem("fertimata.session", session);
        localStorage.setItem("fertimata.guide", "seen");
        localStorage.setItem("fertimata.theme", "light");
      } catch {
        // abaikan
      }
    },
    [JSON.stringify({ token: "demo", expiresAt: far, refreshToken: "demo", refreshExpiresAt: far, user: demo.me })],
  );

  const routes = {
    "/auth/me": demo.me,
    "/push/config": demo.push,
    "/dashboard/overview": demo.overview,
    "/devices": demo.devices,
    "/actuators": demo.actuators,
    "/ai/status": demo.aiStatus,
    "/ai/detections": demo.detections,
    "/irrigation/schedules": demo.irrigation,
    "/fertilization/schedule": demo.fertilization,
  };
  await ctx.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
    if (route.request().method() !== "GET") return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    const body = routes[path];
    return route.fulfill({ status: body === undefined ? 404 : 200, contentType: "application/json", body: JSON.stringify(body ?? { message: "contoh: tidak ada" }) });
  });

  mkdirSync(join(root, "public/panduan"), { recursive: true });
  mkdirSync(join(root, "src/lib/guide-visual"), { recursive: true });

  for (const spec of pages.filter((p) => !only || p.slug === only)) {
    const page = await ctx.newPage();
    // WebSocket STOMP palsu: cukup menjawab CONNECT supaya penanda "Langsung" menyala.
    await page.routeWebSocket(/\/ws(\?.*)?$/, (ws) => {
      ws.onMessage((m) => {
        if (String(m).startsWith("CONNECT")) ws.send("CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0");
      });
    });
    await page.goto(base + spec.path, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important} section[aria-label="Simpan aplikasi"]{display:none!important}' });
    // Viewport setinggi halaman: menu bawah (fixed) jatuh di akhir halaman, bukan menimpa tengah gambar.
    const h0 = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: WIDTH, height: h0 });
    await page.waitForTimeout(800);

    const boxes = {};
    for (const s of spec.spots) {
      boxes[s.id] = await page.evaluate(locate, s.find);
      if (!boxes[s.id]) throw new Error(`Bagian "${s.id}" tidak ditemukan di ${spec.path} (aturan: ${JSON.stringify(s.find)})`);
    }
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const PAD = 14;
    const parts = [];
    for (const [i, p] of spec.parts.entries()) {
      const top = Math.max(0, p.from ? boxes[p.from].y - PAD : 0);
      const bottom = Math.min(pageHeight, p.to ? boxes[p.to].y + boxes[p.to].h + PAD : pageHeight);
      const file = `${spec.slug}-${i + 1}.jpg`;
      await page.screenshot({ path: join(root, "public/panduan", file), type: "jpeg", quality: 82, fullPage: true, clip: { x: 0, y: top, width: WIDTH, height: bottom - top } });
      const height = bottom - top;
      const inside = spec.spots
        .map((s, n) => ({ id: s.id, n: n + 1, b: boxes[s.id] }))
        .filter(({ b }) => b.y + b.h / 2 >= top && b.y + b.h / 2 <= bottom)
        .map(({ id, n, b }) => ({
          id,
          n,
          x: +((b.x / WIDTH) * 100).toFixed(2),
          y: +(((b.y - top) / height) * 100).toFixed(2),
          w: +((b.w / WIDTH) * 100).toFixed(2),
          h: +((b.h / height) * 100).toFixed(2),
        }));
      parts.push({ image: `/panduan/${file}`, width: WIDTH * SCALE, height: Math.round(height * SCALE), spots: inside });
    }
    writeFileSync(join(root, "src/lib/guide-visual", `${spec.slug}.generated.json`), JSON.stringify({ slug: spec.slug, parts }, null, 2) + "\n");
    console.log(`${spec.slug}: ${parts.map((p) => `${p.image} (${p.spots.length} nomor)`).join(", ")}`);
    await page.close();
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
