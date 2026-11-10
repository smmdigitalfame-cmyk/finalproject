import { randomBytes, timingSafeEqual } from "crypto";
import { createFileRoute } from "@tanstack/react-router";
import { tiktokOrderSchema, tiktokKeyResponseSchema } from "@/lib/tiktokOrder";

// Internal endpoint called ONLY by the central Telegram bot (Insightseditorall_bot,
// hosted in the Instagram project) after a payment is fully verified.
// Authenticated with the shared BOT_INTERNAL_SECRET; idempotent per order_id so
// duplicate payment callbacks never mint a second key.

function secretMatches(received: string | null, expected: string) {
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const Route = createFileRoute("/api/public/bot/tiktok-key")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["BOT_INTERNAL_SECRET"];
        if (!secret) return Response.json({ error: "not configured" }, { status: 503 });
        if (!secretMatches(request.headers.get("x-bot-internal-secret"), secret)) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "bad json" }, { status: 400 });
        }
        const parsed = tiktokOrderSchema.safeParse(body);
        if (!parsed.success) return Response.json({ error: "invalid request" }, { status: 400 });
        const { order_id, plan_id, telegram_chat_id } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data, error } = await supabaseAdmin.rpc("mint_tiktok_order_key", {
          p_order_id: order_id,
          p_plan_id: plan_id,
          p_telegram_chat_id: telegram_chat_id,
          p_candidate_key: `TT-${randomBytes(10).toString("hex").toUpperCase()}`,
        });
        if (error) {
          if (error.code === "22023" && error.message === "order conflict") {
            return Response.json({ error: "order conflict" }, { status: 409 });
          }
          return Response.json({ error: "key creation failed" }, { status: 500 });
        }
        const result = tiktokKeyResponseSchema.safeParse(data);
        if (!result.success) return Response.json({ error: "key unavailable" }, { status: 500 });
        return Response.json(result.data, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
