import { randomUUID } from "crypto";
import { describe, expect, it } from "vitest";
import { tiktokKeyResponseSchema } from "./tiktokOrder";

// Opt-in integration checks exercise the real endpoint and database transaction.
const base = process.env.TIKTOK_TEST_BASE_URL;
const secret = process.env.BOT_INTERNAL_SECRET;
const suite = base && secret ? describe : describe.skip;
suite("real atomic TikTok fulfillment", () => {
  const headers = { "Content-Type": "application/json", "x-bot-internal-secret": secret ?? "" };
  const customer = "900000000000000001";
  const post = (body: unknown) => fetch(`${base}/api/public/bot/tiktok-key`, { method: "POST", headers, body: JSON.stringify(body) });
  for (const [plan, days] of [["day", 1], ["week", 7], ["month", 30], ["lifetime", null]] as const) {
    it(`${plan} creates one key under 12 parallel requests and preserves its expiry`, async () => {
      const order = { product: "tiktok", order_id: randomUUID(), plan_id: plan, telegram_chat_id: customer };
      const started = Date.now();
      const responses = await Promise.all(Array.from({ length: 12 }, () => post(order)));
      expect(responses.every((r) => r.status === 200)).toBe(true);
      const results = await Promise.all(responses.map(async (r) => tiktokKeyResponseSchema.parse(await r.json())));
      try {
        expect(new Set(results.map((r) => r.key_code)).size).toBe(1);
        expect(results.filter((r) => !r.reused).length).toBe(1);
        const first = results[0];
        if (!first) throw new Error("missing response");
        if (days === null) expect(first.expires_at).toBeNull();
        else {
          expect(first.expires_at).not.toBeNull();
          const expiry = Date.parse(first.expires_at ?? "");
          expect(expiry).toBeGreaterThanOrEqual(started + days * 86_400_000 - 1000);
          expect(expiry).toBeLessThanOrEqual(Date.now() + days * 86_400_000 + 1000);
        }
        const retry = tiktokKeyResponseSchema.parse(await (await post(order)).json());
        expect(retry.key_code === first.key_code).toBe(true);
        expect(retry.expires_at).toBe(first.expires_at);
        expect(retry.reused).toBe(true);
        expect((await post({ ...order, telegram_chat_id: "900000000000000002" })).status).toBe(409);
        expect((await post({ ...order, plan_id: plan === "day" ? "week" : "day" })).status).toBe(409);
        expect((await post({ ...order, product: "instagram" })).status).toBe(400);
      } finally {
        for (const code of new Set(results.map((r) => r.key_code))) {
          const revoked = await fetch(`${base}/api/public/bot/tiktok-admin`, { method: "POST", headers, body: JSON.stringify({ action: "revoke", key_code: code }) });
          expect(revoked.status).toBe(200);
        }
      }
    }, 60000);
  }
  it("rejects calls without shared-secret authentication", async () => {
    const response = await fetch(`${base}/api/public/bot/tiktok-key`, { method: "POST", body: "{}" });
    expect(response.status).toBe(401);
  });
});