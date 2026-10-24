import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { resolveClientIp } from "./requestIdentity";

const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60_000;
const KEY_PATTERN = /^TT-[0-9A-F]{12,32}$/;

export const checkAccessKey = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ key: z.string().trim().min(1).max(64), device_id: z.string().uuid().optional(), login: z.boolean().optional() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const identityHeaders = new Headers();
    for (const name of ["cf-connecting-ip", "x-vercel-forwarded-for", "x-real-ip"]) {
      const value = getRequestHeader(name);
      if (value) identityHeaders.set(name, value);
    }
    const ip = resolveClientIp(identityHeaders, getRequestIP(), process.env["VERCEL"] === "1");
    const since = new Date(Date.now() - WINDOW_MS).toISOString();

    const { count } = await supabaseAdmin
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("success", false)
      .gte("created_at", since);
    const locked = (count ?? 0) >= MAX_FAILS;

    const fail = async (reason: string) => {
      await alertFail(locked ? "Blocked (too many tries)" : reason);
      if (locked) return { valid: false as const, reason: "Bahut galat try. 15 minute baad try karein." };
      await supabaseAdmin.from("login_attempts").insert({ ip, success: false });
      await new Promise((r) => setTimeout(r, 1000));
      return { valid: false as const, reason };
    };

    // Keys pasted from Telegram can carry spaces, invisible characters or a fancy dash; clean them up.
    const key = data.key
      .normalize("NFKC")
      .replace(/[\s\u200B-\u200D\u2060\uFEFF`'"]/g, "")
      .replace(/[\u2010-\u2015\u2212]/g, "-")
      .toUpperCase();
    const { notifyAdmins, esc } = await import("@/lib/telegramNotify.server");
    const ua = esc((getRequestHeader("user-agent") || "unknown").slice(0, 120));
    const when = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const alertFail = async (reason: string) => {
      // Only alert on the first failure per IP in the window, to avoid message spam from retries
      if (data.login && (count ?? 0) === 0) await notifyAdmins(`⚠️ <b>Login failed</b>\nKey: <code>${esc(key.slice(0, 40))}</code>\nReason: ${esc(reason)}\nIP: ${esc(ip)}\nDevice: ${ua}\nTime: ${when} IST`);
    };
    if (!KEY_PATTERN.test(key)) return fail("Invalid ya revoked key");

    const { data: row, error } = await supabaseAdmin
      .from("access_keys")
      .select("key_code, label, is_active, is_admin, expires_at")
      .eq("key_code", key)
      .maybeSingle();
    if (error) {
      console.error("Access key check failed", error);
      return { valid: false as const, transient: true as const, reason: "Server error, retry karein" };
    }
    if (!row || !row.is_active) return fail("Invalid ya revoked key");
    if (row.expires_at && new Date(row.expires_at) <= new Date()) {
      await alertFail("Key expired");
      return { valid: false as const, reason: "Key expire ho gayi" };
    }
    const { data: deviceAllowed, error: deviceError } = await supabaseAdmin.rpc("check_access_key_device", {
      p_key: key, p_device: data.device_id ?? "", p_register: data.login === true,
    });
    if (deviceError) {
      console.error("Access key device check failed", deviceError);
      return { valid: false as const, transient: true as const, reason: "Server error, retry karein" };
    }
    if (deviceAllowed !== true) return { valid: false as const, reason: "Is key ki device limit poori ho gayi. Pehle se registered device par login karein." };
    // Confirmed key/device clears this IP's failed tries.
    if ((count ?? 0) > 0) {
      await supabaseAdmin.from("login_attempts").delete().eq("ip", ip).eq("success", false);
    }
    if (data.login) {
      const { count: recent } = await supabaseAdmin
        .from("login_attempts")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip)
        .eq("success", true)
        .eq("key_code" as never, row.key_code as never)
        .gte("created_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString());
      const alreadyNotified = (recent ?? 0) > 0;
      await supabaseAdmin.from("login_attempts").insert({ ip, success: true, key_code: row.key_code } as never);
      if (!alreadyNotified) await notifyAdmins(`✅ <b>Login success</b>\nName: ${esc(row.label ?? "-")}\nKey: <code>${row.key_code}</code>\nExpires: ${row.expires_at ? new Date(row.expires_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "Lifetime"}\nIP: ${esc(ip)}\nDevice: ${ua}\nTime: ${when} IST`);
    }
    return {
      valid: true as const,
      key_id: row.key_code,
      label: row.label ?? row.key_code,
      expires_at: row.expires_at,
      is_admin: row.is_admin,
    };
  });
