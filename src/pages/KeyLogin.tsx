import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkAccessKey } from "@/lib/accessKeys.functions";
import { Fingerprint, Send, Shield, Sparkles, Timer, MessageCircle, BadgeCheck } from "lucide-react";

const getDeviceId = (): string => {
  let id = localStorage.getItem("device_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("device_id", id); }
  return id;
};

const KeyLogin = () => {
  const [keyCode, setKeyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("access_key")) navigate({ to: "/" });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyCode.trim()) return;
    setLoading(true);
    try {
      const res = await checkAccessKey({ data: { key: keyCode.trim(), login: true } });
      if (!res.valid) {
        toast.error(res.reason);
        return;
      }
      localStorage.setItem("access_key", JSON.stringify({
        key_id: res.key_id,
        label: res.label,
        expires_at: res.expires_at,
        is_admin: res.is_admin,
      }));
      toast.success("Access granted!");
    } catch {
      toast.error("Server error, retry karein");
      return;
    } finally {
      setLoading(false);
    }
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden dark">
      {/* Background ambient glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-tiktok-cyan/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-[420px] bg-card/[0.03] backdrop-blur-2xl border border-border/50 rounded-[40px] p-10 shadow-2xl">
        {/* Decorative top edge light */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        {/* Fingerprint icon */}
        <div className="flex justify-center mb-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-b from-foreground/10 to-foreground/5 border border-border/50 flex items-center justify-center shadow-inner overflow-hidden">
              <Fingerprint className="w-12 h-12 text-primary relative z-10" />
              {/* Scanning line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line opacity-50" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">Reels Lab</h1>
          <p className="text-muted-foreground/70 text-sm">Enter your project access key to continue</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <input
              type="text"
              value={keyCode}
              onChange={(e) => setKeyCode(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Enter access key..."
              className="w-full bg-foreground/5 border border-border/50 rounded-2xl py-4 px-6 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-center tracking-[0.2em] font-mono"
              disabled={loading}
              autoComplete="off"
              autoFocus
            />
            <Shield className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${focused ? "text-primary" : "text-muted-foreground/30"}`} />
          </div>

          <button
            type="submit"
            disabled={loading || !keyCode.trim()}
            className="w-full group relative overflow-hidden rounded-2xl py-4 bg-primary font-bold text-primary-foreground shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Verify Key
                </>
              )}
            </span>
            <div className="absolute inset-0 bg-primary-foreground/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
        </form>

        {/* Trust features grid */}
        <div className="mt-12 grid grid-cols-2 gap-4">
          <Feature icon={BadgeCheck} text="Secure key-based authentication" />
          <Feature icon={Sparkles} text="Device-locked access" />
          <Feature icon={Timer} text="Time-limited keys supported" />
          <Feature icon={MessageCircle} text="Admin notified via Telegram" />
        </div>
      </div>
    </div>
  );
};

const Feature = ({ icon: Icon, text }: { icon: React.ComponentType<any>; text: string }) => (
  <div className="flex items-start space-x-3">
    <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center border border-border/50 flex-shrink-0 mt-0.5">
      <Icon className="w-4 h-4 text-tiktok-cyan" />
    </div>
    <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider leading-5">{text}</span>
  </div>
);

export default KeyLogin;
