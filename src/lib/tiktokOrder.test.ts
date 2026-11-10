import { describe, expect, it } from "vitest";
import { tiktokOrderSchema } from "./tiktokOrder";

const order = { product: "tiktok", order_id: "6d975740-eafd-4af4-9189-1196f0dd6bc2", plan_id: "month", telegram_chat_id: "8766641148" };
describe("central bot product isolation", () => {
  it("accepts a TikTok order", () => {
    expect(tiktokOrderSchema.parse(order).product).toBe("tiktok");
  });
  it("cannot mint TikTok keys for Instagram orders", () => {
    expect(tiktokOrderSchema.safeParse({ ...order, product: "instagram" }).success).toBe(false);
  });
  it("requires stable UUID order identity", () => {
    expect(tiktokOrderSchema.safeParse({ ...order, order_id: "invoice-123" }).success).toBe(false);
  });
});