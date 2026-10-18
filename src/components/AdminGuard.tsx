import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkAccessKey } from "@/lib/accessKeys.functions";

interface AdminGuardProps {
  children: React.ReactNode;
}

interface StatusResult {
  valid?: boolean;
  is_admin?: boolean;
  reason?: string;
  expires_at?: string;
}

const CACHE_TTL_MS = 60_000; // 1 minute
const DEBOUNCE_MS = 400;

// Module-level cache shared across mounts/routes
const statusCache = new Map<string, { at: number; data: StatusResult }>();
const inflight = new Map<string, Promise<StatusResult | null>>();

const cacheKey = (key_id: string, device_id: string) => `${key_id}::${device_id}`;

async function fetchStatus(
  key_id: string,
  device_id: string,
  force = false,
): Promise<StatusResult | null> {
  const ck = cacheKey(key_id, device_id);

  if (!force) {
    const cached = statusCache.get(ck);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const existing = inflight.get(ck);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-key-status", {
        body: { key_id, device_id },
      });
      if (error) return null;
      const result = (data ?? {}) as StatusResult;
      statusCache.set(ck, { at: Date.now(), data: result });
      return result;
    } catch {
      return null;
    } finally {
      inflight.delete(ck);
    }
  })();

  inflight.set(ck, promise);
  return promise;
}

const AdminGuard = ({ children }: AdminGuardProps) => {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const navigate = useNavigate();
  const debounceRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const verify = useCallback(async () => {
    const saved = localStorage.getItem("access_key");
    const device_id = localStorage.getItem("device_id") || "";
    if (!saved) {
      navigate({ to: "/key-login" });
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(saved);
    } catch {
      navigate({ to: "/key-login" });
      return;
    }

    if (!parsed.is_admin) {
      toast.error("Admin access required");
      navigate({ to: "/" });
      return;
    }

    let data: any = null;
    try { data = await checkAccessKey({ data: { key: String(parsed.key_id || "") } }); } catch { data = null; }
    if (!mountedRef.current) return;

    if (!data || data.valid !== true) {
      localStorage.removeItem("access_key");
      toast.error(data.reason || "Access revoked");
      navigate({ to: "/key-login" });
      return;
    }

    if (typeof data.is_admin === "boolean") {
      parsed.is_admin = data.is_admin;
      localStorage.setItem("access_key", JSON.stringify(parsed));
      if (!data.is_admin) {
        setAllowed(false);
        toast.error("Admin access required");
        navigate({ to: "/" });
        return;
      }
    }
    setAllowed(data.is_admin === true);
    setChecking(false);
  }, [navigate]);

  const debouncedVerify = useCallback(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      verify();
    }, DEBOUNCE_MS);
  }, [verify]);

  useEffect(() => {
    mountedRef.current = true;
    verify(); // immediate on mount (uses cache if fresh)

    const handleFocus = () => debouncedVerify();
    window.addEventListener("focus", handleFocus);

    return () => {
      mountedRef.current = false;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      window.removeEventListener("focus", handleFocus);
    };
  }, [verify, debouncedVerify]);

  if (checking) return <div className="min-h-screen bg-background" />;
  if (!allowed) return null;
  return <>{children}</>;
};

export default AdminGuard;
