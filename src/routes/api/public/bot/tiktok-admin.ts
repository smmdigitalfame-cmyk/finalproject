import { randomBytes, timingSafeEqual } from "crypto";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Internal admin endpoint called ONLY by the central Telegram bot
// (Insightseditorall_bot, hosted in the Instagram project) so admins can
// create and revoke TikTok access keys from the same bot chat.
// Authenticated with the shared BOT_INTERNAL_SECRET.

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("gen"),
    name: z.string().regex(/^[\w.-]{1,40}$/),
    days: z.number().int().min(1).max(3650).nullable(),
  }),
  z.object({
    action: z.literal("revoke"),
    key_code: z.string().regex(/^TT-[0-9A-F]{12,32}$/),
  }),
]);

function secretMatches(received: string | null, expected: string) {
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const Route = createFileRoute("/api/public/bot/tiktok-admin")({
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
        const parsed = requestSchema.safeParse(body);
        if (!parsed.success) return Response.json({ error: "invalid request" }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (parsed.data.action === "gen") {
          const { name, days } = parsed.data;
          const keyCode = `TT-${randomBytes(10).toString("hex").toUpperCase()}`;
          const expiresAt = days === null ? null : new Date(Date.now() + days * 86_400_000).toISOString();
          const { error } = await supabaseAdmin.from("access_keys").insert({
            key_code: keyCode,
            label: name,
            is_active: true,
            is_admin: false,
            expires_at: expiresAt,
          });
          if (error) return Response.json({ error: "key creation failed" }, { status: 500 });
          return Response.json({ key_code: keyCode, expires_at: expiresAt });
        }

        const { data, error } = await supabaseAdmin
          .from("access_keys")
          .update({ is_active: false })
          .eq("key_code", parsed.data.key_code)
          .select("key_code");
        if (error) return Response.json({ error: "revoke failed" }, { status: 500 });
        if (!data || data.length === 0) return Response.json({ error: "key not found" }, { status: 404 });
        return Response.json({ revoked: true });
      },
    },
  },
});
