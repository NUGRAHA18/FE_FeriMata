import { describe, expect, it } from "vitest";
import { durationWords, formatTimeTyping, minutesText, parseMinutes, parseTimeText } from "./time-input";

describe("ketikan jam (24 jam, tanpa AM/PM)", () => {
  it("titik dua disisipkan saat mengetik; titik/koma dianggap titik dua", () => {
    expect(formatTimeTyping("06")).toBe("06");
    expect(formatTimeTyping("060")).toBe("06:0");
    expect(formatTimeTyping("0600")).toBe("06:00");
    expect(formatTimeTyping("600")).toBe("6:00");
    expect(formatTimeTyping("1730")).toBe("17:30");
    expect(formatTimeTyping("930")).toBe("9:30");
    expect(formatTimeTyping("2400")).toBe("24:00");
    expect(formatTimeTyping("6.00")).toBe("6:00");
    expect(formatTimeTyping("6,3")).toBe("6:3");
    expect(formatTimeTyping("06:00abc")).toBe("06:00");
  });

  it("dirapikan ke HH:mm; yang tidak sah → null", () => {
    expect(parseTimeText("0600")).toBe("06:00");
    expect(parseTimeText("600")).toBe("06:00");
    expect(parseTimeText("6.00")).toBe("06:00");
    expect(parseTimeText("6")).toBe("06:00");
    expect(parseTimeText("17:5")).toBe("17:05");
    expect(parseTimeText("24:00")).toBeNull();
    expect(parseTimeText("2575")).toBeNull();
    expect(parseTimeText("06:75")).toBeNull();
    expect(parseTimeText("")).toBeNull();
  });
});

describe("lama siram dalam menit", () => {
  it("koma desimal boleh; hasil detik dibulatkan", () => {
    expect(parseMinutes("5")).toBe(300);
    expect(parseMinutes("1,5")).toBe(90);
    expect(parseMinutes("0.25")).toBe(15);
    expect(parseMinutes("")).toBeNull();
    expect(parseMinutes("5 menit")).toBeNull();
  });

  it("isian awal saat mengubah, dan teks batas", () => {
    expect(minutesText(300)).toBe("5");
    expect(minutesText(90)).toBe("1,5");
    expect(durationWords(900)).toBe("15 menit");
    expect(durationWords(90)).toBe("1 menit 30 detik");
  });
});
