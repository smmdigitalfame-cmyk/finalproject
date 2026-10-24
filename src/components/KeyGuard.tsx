import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkAccessKey } from "@/lib/accessKeys.functions";
import { getDeviceId } from "@/lib/deviceIdentity";

interface KeyGuardProps {
  children: React.ReactNode;
}

const KeyGuard = ({ children }: KeyGuardProps) => {
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const navigate = useNavigate();

  const logout = useCallback((reason?: string) => {
    localStorage.removeItem("access_key");
    if (reason) toast.error(reason);
    navigate({ to: "/key-login" });
  }, [navigate]);

  const checkKey = useCallback(async () => {
    const saved = localStorage.getItem("access_key");
    if (!saved) {
      navigate({ to: "/key-login" });
      return;
    }

    try {
      const parsed = JSON.parse(saved as string);
      const { key_id } = parsed;


      // Expiry is decided by the server (an admin can extend a key, e.g. to lifetime)

      let data: any = null; let error: unknown = null;
      try { data = await checkAccessKey({ data: { key: key_id, device_id: getDeviceId() } }); } catch (e) { error = e; }

      // Network error or server error — DON'T logout, just skip check
      if (error || !data) {
        // Fail closed: never open the app without a confirmed server check
        if (!valid) { setChecking(false); navigate({ to: "/key-login" }); }
        return;
      }

      // A temporary server/network hiccup must never log the user out
      if (data.transient) {
        if (!valid) setTimeout(checkKey, 2000);
        return;
      }

      // Only logout if server explicitly says key is invalid (revoked/expired)
      if (data.valid !== true) {
        logout(data.reason || "Access revoked");
        return;
      }

      // Update expiry/admin from server if available
      parsed.expires_at = data.expires_at ?? null;
      if (typeof data?.is_admin === "boolean") parsed.is_admin = data.is_admin;
      localStorage.setItem("access_key", JSON.stringify(parsed));

      setValid(true);
    } catch {
      // Parse error or unexpected error — DON'T logout, stay logged in
      logout("Invalid session");
      return;
    }
    setChecking(false);
  }, [logout, navigate, valid]);

  useEffect(() => {
    checkKey();

    // Check every 2 minutes instead of 1 (less aggressive)
    const interval = setInterval(checkKey, 15000);
    const handleFocus = () => checkKey();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [checkKey]);

  if (checking) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!valid) return null;

  return <>{children}</>;
};

export default KeyGuard;
