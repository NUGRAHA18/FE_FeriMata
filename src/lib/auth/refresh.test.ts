import { describe, expect, it } from "vitest";
import { needsRefresh, REFRESH_LEEWAY_MS } from "./refresh";

describe("needsRefresh", () => {
  const now = Date.parse("2026-10-20T07:00:00Z");
  it("memperbarui token hanya saat hampir habis", () => {
    expect(needsRefresh(new Date(now + 60 * 60_000).toISOString(), now)).toBe(false);
    expect(needsRefresh(new Date(now + REFRESH_LEEWAY_MS - 1).toISOString(), now)).toBe(true);
    expect(needsRefresh(new Date(now - 1000).toISOString(), now)).toBe(true);
  });
  it("tanggal rusak dianggap perlu diperbarui", () => {
    expect(needsRefresh("bukan tanggal", now)).toBe(true);
  });
});
