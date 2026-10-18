import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { resolveClientIp } from "./requestIdentity";

const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60_000;
const KEY_PATTERN = /^TT-[0-9A-F]{12,32}$/;

export const checkAccessKey = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ key: z.string().trim().min(1).max(64), login: z.boolean().optional() }).parse(data))
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

    const key = data.key.toUpperCase();
    const { notifyAdmins, esc } = await import("@/lib/telegramNotify.server");
    const ua = esc((getRequestHeader("user-agent") || "unknown").slice(0, 120));
    const when = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const alertFail = async (reason: string) => {
      if (data.login) await notifyAdmins(`⚠️ <b>Login failed</b>\nKey: <code>${esc(key.slice(0, 40))}</code>\nReason: ${esc(reason)}\nIP: ${esc(ip)}\nDevice: ${ua}\nTime: ${when} IST`);
    };
    if (!KEY_PATTERN.test(key)) return fail("Invalid ya revoked key");

    const { data: row, error } = await supabaseAdmin
      .from("access_keys")
      .select("key_code, label, is_active, is_admin, expires_at")
      .eq("key_code", key)
      .maybeSingle();
    if (error) {
      console.error("Access key check failed", error);
      return { valid: false as const, reason: "Server error, retry karein" };
    }
    if (!row || !row.is_active) return fail("Invalid ya revoked key");
    if (row.expires_at && new Date(row.expires_at) <= new Date()) {
      await alertFail("Key expired");
      return { valid: false as const, reason: "Key expire ho gayi" };
    }
    // Real key always opens (80-bit keys can't be guessed); clear this IP's failed tries
    if ((count ?? 0) > 0) {
      await supabaseAdmin.from("login_attempts").delete().eq("ip", ip).eq("success", false);
    }
    if (data.login) {
      await supabaseAdmin.from("login_attempts").insert({ ip, success: true, key_code: row.key_code } as never);
      await notifyAdmins(`✅ <b>Login success</b>\nName: ${esc(row.label ?? "-")}\nKey: <code>${row.key_code}</code>\nExpires: ${row.expires_at ? new Date(row.expires_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "Lifetime"}\nIP: ${esc(ip)}\nDevice: ${ua}\nTime: ${when} IST`);
    }
    return {
      valid: true as const,
      key_id: row.key_code,
      label: row.label ?? row.key_code,
      expires_at: row.expires_at,
      is_admin: row.is_admin,
    };
  });
