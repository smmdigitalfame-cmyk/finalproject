import { z } from "zod";

// Product discriminator prevents the central bot from minting a TikTok key
// for an explicitly Instagram order; omitted product keeps older callers valid.
export const tiktokOrderSchema = z.object({
  product: z.literal("tiktok").default("tiktok"),
  order_id: z.string().uuid(),
  plan_id: z.enum(["day", "week", "month", "lifetime"]),
  telegram_chat_id: z.string().regex(/^-?\d{1,20}$/),
});

export const tiktokKeyResponseSchema = z.object({
  product: z.literal("tiktok"),
  key_code: z.string().regex(/^TT-[0-9A-F]{20}$/),
  expires_at: z.string().datetime({ offset: true }).nullable(),
  reused: z.boolean(),
});