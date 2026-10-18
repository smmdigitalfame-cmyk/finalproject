export async function notifyAdmins(text: string) {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  const raw = process.env["TELEGRAM_CHAT_ID"];
  if (!token || !raw) return;
  const ids = [...new Set(raw.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean))];
  await Promise.all(
    ids.map(async (chat_id) => {
      try {
        const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id, text, parse_mode: "HTML" }),
        });
        if (!r.ok) console.error("notifyAdmins failed", r.status, await r.text());
      } catch (e) {
        console.error("notifyAdmins error", e);
      }
    }),
  );
}
export function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
