import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { notifyAdmins, esc } from "@/lib/telegramNotify.server";

const telegramUpdateSchema = z.object({
  update_id: z.number().int(),
  message: z
    .object({
      text: z.string().max(500).optional(),
      chat: z.object({ id: z.union([z.number(), z.string()]) }),
      from: z.object({ first_name: z.string().max(100).optional() }).optional(),
    })
    .optional(),
});

type TelegramReply = { ok?: boolean; description?: string };

function webhookSecret(token: string) {
  return createHash("sha256").update(`telegram-webhook:${token}`).digest("base64url");
}

function equalSecrets(received: string, expected: string) {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function adminIds(raw: string) {
  return new Set(raw.split(/[\s,;]+/).map((id) => id.trim()).filter(Boolean));
}

async function sendTelegram(token: string, chatId: string, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  const result = (await response.json()) as TelegramReply;
  if (!response.ok || !result.ok) {
    throw new Error(`Telegram send failed [${response.status}]: ${result.description ?? "Unknown error"}`);
  }
}

function parseDuration(text: string) {
  const parts = text.trim().split(/\s+/);
  if (parts[0]?.toLowerCase() !== "/gen") return null;
  const name = parts[1];
  const period = parts[2]?.toLowerCase();
  if (parts.length !== 3 || !name || !/^[\w.-]{1,40}$/.test(name) || !period) return { invalid: true } as const;
  if (period === "lifetime") return { invalid: false, name, expiresAt: null, label: "Lifetime" } as const;
  const days = Number(period);
  if (!Number.isInteger(days) || days < 1 || days > 3650) return { invalid: true } as const;
  return { invalid: false, name, expiresAt: new Date(Date.now() + days * 86_400_000), label: `${days} day${days > 1 ? "s" : ""}` } as const;
}

async function createAccessKey(expiresAt: Date | null, name: string) {
  const keyCode = `TT-${randomBytes(10).toString("hex").toUpperCase()}`;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("access_keys").insert({
    key_code: keyCode,
    label: name,
    is_active: true,
    is_admin: false,
    expires_at: expiresAt ? expiresAt.toISOString() : null,
  });
  if (error) throw new Error(`Key save failed: ${error.message}`);
  return keyCode;
}

async function revokeAccessKey(keyCode: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("access_keys")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("key_code", keyCode)
    .eq("is_active", true)
    .select("id");
  if (error) {
    console.error("Telegram key revoke failed", error);
    return "error" as const;
  }
  return data && data.length > 0 ? ("revoked" as const) : ("not-found" as const);
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env["TELEGRAM_BOT_TOKEN"];
        const configuredAdmins = process.env["TELEGRAM_CHAT_ID"];
        if (!token || !configuredAdmins) return new Response("Bot is not configured", { status: 503 });

        const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
        if (!equalSecrets(receivedSecret, webhookSecret(token))) {
          return new Response("Unauthorized", { status: 401 });
        }

        const parsed = telegramUpdateSchema.safeParse(await request.json());
        if (!parsed.success || !parsed.data.message?.text) return Response.json({ ok: true });

        const chatId = String(parsed.data.message.chat.id);
        const text = parsed.data.message.text.trim();
        const adminName = parsed.data.message.from?.first_name ?? "Admin";
        if (!adminIds(configuredAdmins).has(chatId)) {
          await sendTelegram(token, chatId, "⛔ Unauthorized. Admin only.");
          return Response.json({ ok: true });
        }

        if (text === "/start" || text === "/help") {
          await sendTelegram(
            token,
            chatId,
            "✅ <b>Admin verified</b>\n\nKey banane ke liye:\n<code>/gen rahul 1</code> — 1 day\n<code>/gen rahul 30</code> — 30 days\n<code>/gen rahul lifetime</code> — lifetime\n\nKey band karne ke liye:\n<code>/revoke TT-XXXXXX</code>",
          );
          return Response.json({ ok: true });
        }

        const revokeMatch = text.match(/^\/revoke\s+(\S+)$/i);
        if (revokeMatch) {
          const keyCode = revokeMatch[1].toUpperCase();
          try {
            const result = await revokeAccessKey(keyCode);
            if (result === "revoked") {
              await notifyAdmins(`🚫 <b>Key revoked</b>\n\n<code>${keyCode}</code>\nBy admin: ${esc(adminName)} (${chatId})\nAb ye key kaam nahi karegi, user auto logout hoga.`);
            } else if (result === "not-found") {
              await sendTelegram(token, chatId, `⚠️ Key <code>${keyCode}</code> nahi mili ya pehle se inactive hai.`);
            } else {
              await sendTelegram(token, chatId, "❌ Key revoke nahi hui. Thodi der baad retry karein.");
            }
          } catch (error) {
            console.error("Telegram key revoke failed", error);
            await sendTelegram(token, chatId, "❌ Key revoke nahi hui. Thodi der baad retry karein.");
          }
          return Response.json({ ok: true });
        }

        const duration = parseDuration(text);
        if (!duration || duration.invalid) {
          await sendTelegram(token, chatId, "Use: <code>/gen name 1</code> (days) ya <code>/gen name lifetime</code>\nKey band karne ke liye: <code>/revoke TT-XXXXXX</code>");
          return Response.json({ ok: true });
        }

        try {
          const key = await createAccessKey(duration.expiresAt, duration.name);
          await notifyAdmins(
            `🔑 <b>Access key created</b>\nBy admin: ${esc(adminName)} (${chatId})\n\n<code>${key}</code>\nName: ${duration.name}\nValid: ${duration.label}\nExpires: ${duration.expiresAt ? duration.expiresAt.toISOString().slice(0, 16).replace("T", " ") + " UTC" : "Never"}`,
          );
        } catch (error) {
          console.error("Telegram key generation failed", error);
          await sendTelegram(token, chatId, "❌ Key create nahi hui. Thodi der baad retry karein.");
        }

        return Response.json({ ok: true });
      },
    },
  },
});