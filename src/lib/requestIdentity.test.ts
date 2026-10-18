import { describe, expect, test } from "vitest";
import { resolveClientIp } from "./requestIdentity";
describe("hosting client identity", () => {
  test("Vercel ignores spoofed Cloudflare and ordinary forwarded headers", () => {
    expect(resolveClientIp(new Headers({ "cf-connecting-ip": "spoof", "x-forwarded-for": "spoof", "x-vercel-forwarded-for": "192.0.2.4" }), "fallback", true)).toBe("192.0.2.4");
  });
  test("Cloudflare retains its provider identity", () => {
    expect(resolveClientIp(new Headers({ "cf-connecting-ip": "192.0.2.5", "x-forwarded-for": "spoof" }), "fallback", false)).toBe("192.0.2.5");
  });
});