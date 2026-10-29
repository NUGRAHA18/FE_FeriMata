import { describe, expect, it } from "vitest";
import { isIos, pushSupport, sameServerKey, urlBase64ToUint8Array } from "./push";

const env = {
  isSecureContext: true,
  userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/130",
  platform: "Linux armv8l",
  maxTouchPoints: 5,
  standalone: false,
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
};

describe("pushSupport", () => {
  it("http://IP bukan konteks aman → minta https dulu", () => {
    expect(pushSupport({ ...env, isSecureContext: false })).toBe("insecure");
  });

  it("iPhone di tab Safari → petunjuk Tambahkan ke Layar Utama; setelah dipasang → ok", () => {
    const iphone = { ...env, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)", platform: "iPhone", hasPushManager: false };
    expect(pushSupport(iphone)).toBe("ios-install");
    expect(pushSupport({ ...iphone, standalone: true, hasPushManager: true })).toBe("ok");
  });

  it("iPad melapor sebagai Mac dengan layar sentuh", () => {
    expect(isIos({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", platform: "MacIntel", maxTouchPoints: 5 })).toBe(true);
    expect(isIos({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", platform: "MacIntel", maxTouchPoints: 0 })).toBe(false);
  });

  it("browser tanpa PushManager → tidak didukung; Android Chrome → ok", () => {
    expect(pushSupport({ ...env, hasPushManager: false })).toBe("unsupported");
    expect(pushSupport(env)).toBe("ok");
  });
});

describe("kunci VAPID", () => {
  it("base64url → byte, dengan padding", () => {
    expect([...urlBase64ToUint8Array("AQID_-8")]).toEqual([1, 2, 3, 255, 239]);
  });

  it("membandingkan kunci langganan dengan kunci server", () => {
    const key = urlBase64ToUint8Array("AQID_-8").buffer;
    expect(sameServerKey(key, "AQID_-8")).toBe(true);
    expect(sameServerKey(key, "AQID")).toBe(false);
    expect(sameServerKey(null, "AQID")).toBe(false);
  });
});
